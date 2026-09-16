import "server-only";
import { randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";

export interface DocuSealSubmissionInput {
  dossierId: string;
  providerSubmissionId: string;
  providerSubmitterId: string | null;
  providerSubmitterSlug: string;
  signerEmail: string;
}

export interface ExistingDocuSealSubmission {
  providerSubmissionId: string;
  providerSubmitterSlug: string;
  status: string;
}

export interface DocuSealSigningContext {
  signerEmail: string;
  signerName: string;
}

export class DocuSealSubmissionRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async getSigningContext(
    dossierId: string,
    userId: string,
    clerkOrganizationId: string,
  ): Promise<DocuSealSigningContext | null> {
    const row = await this.database
      .prepare(
        `SELECT c.contact_email AS signer_email,
                COALESCE(NULLIF(c.contact_name, ''), c.legal_name) AS signer_name
         FROM dossiers d
         JOIN clients c ON c.id = d.client_id
         JOIN organizations resource_org ON resource_org.id = d.organization_id
         JOIN organizations actor_org
           ON actor_org.clerk_org_id = ? OR actor_org.id = ?
         JOIN memberships membership
           ON membership.organization_id = actor_org.id
          AND membership.user_id = ?
          AND membership.status = 'ACTIVE'
         WHERE d.id = ?
           AND c.contact_email IS NOT NULL
           AND membership.role IN (
             'SUPER_ADMIN', 'MASTER_ADMIN', 'MASTER_BACKOFFICE',
             'SUB_REGIE_ADMIN', 'TEAM_MANAGER', 'APPORTEUR'
           )
           AND (
             membership.role = 'SUPER_ADMIN'
             OR d.owner_user_id = ?
             OR resource_org.path = actor_org.path
             OR resource_org.path LIKE actor_org.path || '.%'
           )
         LIMIT 1`,
      )
      .bind(clerkOrganizationId, clerkOrganizationId, userId, dossierId, userId)
      .first<{ signer_email: string; signer_name: string }>();
    if (!row) return null;
    return { signerEmail: row.signer_email, signerName: row.signer_name };
  }

  async findActive(dossierId: string): Promise<ExistingDocuSealSubmission | null> {
    const row = await this.database
      .prepare(
        `SELECT provider_submission_id, provider_submitter_slug, status
         FROM signature_submissions
         WHERE provider = 'DOCUSEAL' AND dossier_id = ?
           AND provider_submitter_slug IS NOT NULL
           AND status IN ('PENDING', 'OPENED', 'COMPLETED')
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(dossierId)
      .first<{
        provider_submission_id: string;
        provider_submitter_slug: string;
        status: string;
      }>();
    if (!row) return null;
    return {
      providerSubmissionId: row.provider_submission_id,
      providerSubmitterSlug: row.provider_submitter_slug,
      status: row.status,
    };
  }

  async record(input: DocuSealSubmissionInput): Promise<boolean> {
    const result = await this.database
      .prepare(
        `INSERT OR IGNORE INTO signature_submissions (
          id, organization_id, dossier_id, provider, provider_submission_id,
          provider_submitter_id, provider_submitter_slug, signer_email
        )
        SELECT ?, organization_id, id, 'DOCUSEAL', ?, ?, ?, ?
        FROM dossiers WHERE id = ?`,
      )
      .bind(
        randomUUID(),
        input.providerSubmissionId,
        input.providerSubmitterId,
        input.providerSubmitterSlug,
        input.signerEmail,
        input.dossierId,
      )
      .run();
    return (result.meta.changes ?? 0) === 1;
  }

  async markCompleted(
    dossierId: string,
    providerSubmissionId: string,
    providerSubmitterId: string,
  ): Promise<boolean> {
    const results = await this.database.batch([
      this.database
        .prepare(
          `UPDATE signature_submissions
           SET status = 'COMPLETED', provider_submitter_id = ?,
               completed_at = unixepoch(), updated_at = unixepoch()
           WHERE provider = 'DOCUSEAL' AND dossier_id = ? AND provider_submission_id = ?`,
        )
        .bind(providerSubmitterId, dossierId, providerSubmissionId),
      this.database
        .prepare(
          `UPDATE dossiers
           SET status = 'signed', signed_at = unixepoch(), updated_at = unixepoch()
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM signature_submissions
             WHERE provider = 'DOCUSEAL' AND dossier_id = ?
               AND provider_submission_id = ? AND status = 'COMPLETED'
           )`,
        )
        .bind(dossierId, dossierId, providerSubmissionId),
    ]);
    return (results[1]?.meta.changes ?? 0) === 1;
  }

  async markDeclined(
    dossierId: string,
    providerSubmissionId: string,
    providerSubmitterId: string,
  ): Promise<boolean> {
    const result = await this.database
      .prepare(
        `UPDATE signature_submissions
         SET status = 'DECLINED', provider_submitter_id = ?, updated_at = unixepoch()
         WHERE provider = 'DOCUSEAL' AND dossier_id = ? AND provider_submission_id = ?`,
      )
      .bind(providerSubmitterId, dossierId, providerSubmissionId)
      .run();
    return (result.meta.changes ?? 0) === 1;
  }
}
