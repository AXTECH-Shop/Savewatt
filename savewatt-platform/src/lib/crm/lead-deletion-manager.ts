import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { DocumentStorageManager } from "@/lib/cloudflare/document-storage-manager";
import { IntakeManager } from "@/lib/intake/intake-manager";
import { CrmError } from "./crm-errors";
import { assertCanDelete, deletionBlocker } from "./lead-deletion-policy";
import { LeadRepository } from "./lead-repository";

export interface DeletionResult {
  leadId: string | null;
  dossierId: string | null;
  intakeSubmissions: number;
  files: number;
}

interface Target {
  organizationId: string;
  leadId: string | null;
  leadStatus: string | null;
  dossierId: string | null;
  submissionId: string | null;
}

/**
 * Erases a lead and everything created from it: the converted client/site/
 * dossier (documents, extractions, offers, deliveries, events, tasks cascade),
 * the public intake submissions, and the stored files in R2. Client and site
 * rows are kept when another dossier or lead still points at them.
 */
export class LeadDeletionManager {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly leads = new LeadRepository(),
    private readonly intake = new IntakeManager(),
  ) {}

  async deleteLead(actor: WorkspaceActor, leadId: string): Promise<DeletionResult> {
    assertCanDelete(actor);
    const lead = await this.leads.find(actor, leadId);
    if (!lead) throw new CrmError("CRM_NOT_FOUND", 404);
    return this.erase(actor, {
      organizationId: lead.organizationId,
      leadId: lead.id,
      leadStatus: lead.status,
      dossierId: lead.convertedDossierId,
      submissionId: null,
    });
  }

  async deleteIntake(actor: WorkspaceActor, submissionId: string): Promise<DeletionResult> {
    assertCanDelete(actor);
    const submission = await this.intake.find(actor, submissionId);
    if (!submission) throw new CrmError("CRM_NOT_FOUND", 404);
    if (submission.leadId) {
      const lead = await this.leads.find(actor, submission.leadId);
      if (lead) return this.deleteLead(actor, lead.id);
    }
    // IntakeManager.find is scoped to the actor's organization.
    return this.erase(actor, {
      organizationId: actor.orgId,
      leadId: null,
      leadStatus: null,
      dossierId: submission.dossierId,
      submissionId,
    });
  }

  private async erase(actor: WorkspaceActor, target: Target): Promise<DeletionResult> {
    const dossier = target.dossierId
      ? await this.database
          .prepare(
            `SELECT dossier.status, dossier.client_id, dossier.site_id,
               (SELECT COUNT(*) FROM signature_submissions s
                 WHERE s.dossier_id = dossier.id AND s.status = 'COMPLETED') AS completed_signatures,
               (SELECT COUNT(*) FROM commission_lines c WHERE c.dossier_id = dossier.id) AS commission_lines
             FROM dossiers dossier WHERE dossier.id = ? LIMIT 1`,
          )
          .bind(target.dossierId)
          .first<{
            status: string;
            client_id: string;
            site_id: string | null;
            completed_signatures: number;
            commission_lines: number;
          }>()
      : null;

    const blocker = deletionBlocker({
      leadStatus: target.leadStatus,
      dossierStatus: dossier?.status ?? null,
      completedSignatures: dossier?.completed_signatures ?? 0,
      commissionLines: dossier?.commission_lines ?? 0,
    });
    if (blocker) throw new CrmError("CRM_CONFLICT", 409, blocker);

    const dossierId = dossier ? target.dossierId : null;
    const submissionFilter = `(id = ? OR (? IS NOT NULL AND lead_id = ?) OR (? IS NOT NULL AND dossier_id = ?))`;
    const submissionBindings = [
      target.submissionId ?? "",
      target.leadId,
      target.leadId,
      dossierId,
      dossierId,
    ];
    const files = await this.fileKeys(submissionFilter, submissionBindings, dossierId);
    const submissions = await this.database
      .prepare(`SELECT COUNT(*) AS n FROM intake_submissions WHERE ${submissionFilter}`)
      .bind(...submissionBindings)
      .first<{ n: number }>();

    const statements: D1PreparedStatement[] = [
      this.database.prepare(`DELETE FROM intake_submissions WHERE ${submissionFilter}`).bind(...submissionBindings),
    ];
    if (target.leadId) {
      statements.push(this.database.prepare(`DELETE FROM leads WHERE id = ?`).bind(target.leadId));
    }
    if (dossier && dossierId) {
      statements.push(this.database.prepare(`DELETE FROM dossiers WHERE id = ?`).bind(dossierId));
      if (dossier.site_id) {
        statements.push(
          this.database
            .prepare(
              `DELETE FROM sites WHERE id = ?
                 AND NOT EXISTS (SELECT 1 FROM dossiers WHERE site_id = ?)
                 AND NOT EXISTS (SELECT 1 FROM leads WHERE converted_site_id = ?)`,
            )
            .bind(dossier.site_id, dossier.site_id, dossier.site_id),
        );
      }
      statements.push(
        this.database
          .prepare(
            `DELETE FROM clients WHERE id = ?
               AND NOT EXISTS (SELECT 1 FROM dossiers WHERE client_id = ?)
               AND NOT EXISTS (SELECT 1 FROM leads WHERE converted_client_id = ?)`,
          )
          .bind(dossier.client_id, dossier.client_id, dossier.client_id),
      );
    }
    statements.push(
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) VALUES (?, ?, ?, 'LEAD_DELETED', ?, ?, ?)`,
        )
        .bind(
          randomUUID(),
          target.organizationId,
          actor.userId,
          target.leadId ? "LEAD" : "INTAKE_SUBMISSION",
          target.leadId ?? target.submissionId,
          JSON.stringify({ dossierId, intakeSubmissions: submissions?.n ?? 0, files: files.length }),
        ),
    );
    await this.database.batch(statements);

    // Rows are gone; stored files follow. A failed R2 delete leaves an orphan
    // object but no reachable personal data, so it must not undo the erase.
    if (files.length) {
      const bucket = DocumentStorageManager.getBucket();
      const results = await Promise.allSettled(files.map((key) => bucket.delete(key)));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) console.error("LEAD_DELETE_R2_CLEANUP_FAILED", { dossierId, failed, total: files.length });
    }
    return {
      leadId: target.leadId,
      dossierId,
      intakeSubmissions: submissions?.n ?? 0,
      files: files.length,
    };
  }

  private async fileKeys(
    submissionFilter: string,
    submissionBindings: (string | null)[],
    dossierId: string | null,
  ): Promise<string[]> {
    const keys = new Set<string>();
    const intake = await this.database
      .prepare(`SELECT file_r2_key, contract_r2_key FROM intake_submissions WHERE ${submissionFilter}`)
      .bind(...submissionBindings)
      .all<{ file_r2_key: string; contract_r2_key: string | null }>();
    for (const row of intake.results ?? []) {
      keys.add(row.file_r2_key);
      if (row.contract_r2_key) keys.add(row.contract_r2_key);
    }
    if (dossierId) {
      const documents = await this.database
        .prepare(`SELECT r2_key FROM documents WHERE dossier_id = ?`)
        .bind(dossierId)
        .all<{ r2_key: string }>();
      for (const row of documents.results ?? []) keys.add(row.r2_key);
      const offers = await this.database
        .prepare(`SELECT pdf_r2_key, pdf_marketing_r2_key FROM offer_versions WHERE dossier_id = ?`)
        .bind(dossierId)
        .all<{ pdf_r2_key: string | null; pdf_marketing_r2_key: string | null }>();
      for (const row of offers.results ?? []) {
        if (row.pdf_r2_key) keys.add(row.pdf_r2_key);
        if (row.pdf_marketing_r2_key) keys.add(row.pdf_marketing_r2_key);
      }
    }
    return [...keys];
  }
}
