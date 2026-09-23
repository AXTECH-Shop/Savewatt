import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import type { ExtractionResult } from "./schema";

export type ExtractionStatus = "EXTRACTED" | "VALIDATED" | "REJECTED";

export interface ExtractionRecord {
  id: string;
  organizationId: string;
  dossierId: string;
  documentId: string;
  model: string;
  status: ExtractionStatus;
  result: ExtractionResult;
  validated: ExtractionResult | null;
  validatedByUserId: string | null;
  validatedAt: number | null;
  createdByUserId: string | null;
  createdAt: number;
}

interface ExtractionRow {
  id: string;
  organization_id: string;
  dossier_id: string;
  document_id: string;
  model: string;
  status: ExtractionStatus;
  raw_json: string;
  field_confidence_json: string;
  overall_confidence: number | null;
  warnings_json: string;
  validated_json: string | null;
  validated_by_user_id: string | null;
  validated_at: number | null;
  created_by_user_id: string | null;
  created_at: number;
}

export class ExtractionRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  async listForDocument(actor: WorkspaceActor, documentId: string): Promise<ExtractionRecord[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const result = await this.database
      .prepare(
        `${this.selectSql()} WHERE extraction.document_id = ? AND ${scope.sql}
         ORDER BY extraction.created_at DESC`,
      )
      .bind(documentId, ...scope.bindings)
      .all<ExtractionRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async find(actor: WorkspaceActor, extractionId: string): Promise<ExtractionRecord | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(`${this.selectSql()} WHERE extraction.id = ? AND ${scope.sql} LIMIT 1`)
      .bind(extractionId, ...scope.bindings)
      .first<ExtractionRow>();
    return row ? this.map(row) : null;
  }

  async create(
    actor: WorkspaceActor,
    input: { documentId: string; dossierId: string; model: string; result: ExtractionResult },
  ): Promise<ExtractionRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const extractionId = randomUUID();
    await this.database
      .prepare(
        `INSERT INTO extractions (
           id, organization_id, dossier_id, document_id, model, status,
           raw_json, field_confidence_json, overall_confidence, warnings_json, created_by_user_id
         ) VALUES (?, ?, ?, ?, ?, 'EXTRACTED', ?, ?, ?, ?, ?)`,
      )
      .bind(
        extractionId,
        actor.orgId,
        input.dossierId,
        input.documentId,
        input.model,
        JSON.stringify(input.result.bill),
        JSON.stringify(input.result.fieldConfidence),
        input.result.overallConfidence,
        JSON.stringify(input.result.warnings),
        actor.userId,
      )
      .run();
    const created = await this.find(actor, extractionId);
    if (!created) throw new CrmError("CRM_NOT_FOUND", 404);
    return created;
  }

  async saveValidated(
    actor: WorkspaceActor,
    extractionId: string,
    validated: ExtractionResult,
  ): Promise<ExtractionRecord> {
    this.scopePolicy.assertCanWrite(actor);
    await this.database
      .prepare(
        `UPDATE extractions
         SET status = 'VALIDATED', validated_json = ?, validated_by_user_id = ?, validated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(JSON.stringify(validated), actor.userId, extractionId)
      .run();
    const updated = await this.find(actor, extractionId);
    if (!updated) throw new CrmError("CRM_NOT_FOUND", 404);
    return updated;
  }

  private selectSql(): string {
    return `SELECT extraction.* FROM extractions extraction
      JOIN documents document ON document.id = extraction.document_id
      JOIN dossiers dossier ON dossier.id = extraction.dossier_id
      JOIN organizations resource_org ON resource_org.id = extraction.organization_id`;
  }

  private map(row: ExtractionRow): ExtractionRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      dossierId: row.dossier_id,
      documentId: row.document_id,
      model: row.model,
      status: row.status,
      result: {
        bill: JSON.parse(row.raw_json) as ExtractionResult["bill"],
        fieldConfidence: JSON.parse(row.field_confidence_json) as ExtractionResult["fieldConfidence"],
        overallConfidence: row.overall_confidence ?? 0,
        warnings: JSON.parse(row.warnings_json) as string[],
      },
      validated: row.validated_json
        ? {
            bill: JSON.parse(row.validated_json) as ExtractionResult["bill"],
            fieldConfidence: JSON.parse(row.field_confidence_json) as ExtractionResult["fieldConfidence"],
            overallConfidence: row.overall_confidence ?? 0,
            warnings: JSON.parse(row.warnings_json) as string[],
          }
        : null,
      validatedByUserId: row.validated_by_user_id,
      validatedAt: row.validated_at,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
    };
  }
}
