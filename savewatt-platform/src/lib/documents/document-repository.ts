import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import type { DocumentRecord, UploadableDocumentKind } from "./document-types";

interface DocumentRow {
  id: string;
  organization_id: string;
  dossier_id: string;
  kind: string;
  r2_key: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  status: DocumentRecord["status"];
  uploaded_by_user_id: string | null;
  created_at: number;
  updated_at: number;
}

interface PendingDocumentInput {
  dossierId: string;
  kind: UploadableDocumentKind;
  r2Key: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
}

export class DocumentRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  async list(actor: WorkspaceActor, dossierId: string): Promise<DocumentRecord[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const result = await this.database
      .prepare(
        `${this.selectSql()}
         WHERE dossier.id = ? AND ${scope.sql} AND document.status <> 'ARCHIVED'
         ORDER BY document.created_at DESC`,
      )
      .bind(dossierId, ...scope.bindings)
      .all<DocumentRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async find(actor: WorkspaceActor, documentId: string): Promise<DocumentRecord | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(
        `${this.selectSql()}
         WHERE document.id = ? AND ${scope.sql} AND document.status = 'AVAILABLE'
         LIMIT 1`,
      )
      .bind(documentId, ...scope.bindings)
      .first<DocumentRow>();
    return row ? this.map(row) : null;
  }

  async createPending(
    actor: WorkspaceActor,
    input: PendingDocumentInput,
  ): Promise<DocumentRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const documentId = randomUUID();
    const result = await this.database
      .prepare(
        `INSERT INTO documents (
           id, organization_id, dossier_id, kind, r2_key, file_name,
           mime_type, byte_size, sha256, status, uploaded_by_user_id
         )
         SELECT ?, dossier.organization_id, dossier.id, ?, ?, ?, ?, ?, ?, 'PENDING', ?
         FROM dossiers dossier
         JOIN organizations resource_org ON resource_org.id = dossier.organization_id
         WHERE dossier.id = ? AND ${scope.sql}`,
      )
      .bind(
        documentId,
        input.kind,
        input.r2Key,
        input.fileName,
        input.mimeType,
        input.byteSize,
        input.sha256,
        actor.userId,
        input.dossierId,
        ...scope.bindings,
      )
      .run();
    if ((result.meta.changes ?? 0) !== 1) throw new CrmError("CRM_NOT_FOUND", 404);
    const row = await this.findById(documentId);
    if (!row) throw new CrmError("CRM_NOT_FOUND", 404);
    return this.map(row);
  }

  async markAvailable(actor: WorkspaceActor, document: DocumentRecord): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE documents SET status = 'AVAILABLE', updated_at = unixepoch()
           WHERE id = ? AND status = 'PENDING'`,
        )
        .bind(document.id),
      this.database
        .prepare(
          `INSERT INTO dossier_events (
             id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
           ) VALUES (?, ?, ?, ?, 'DOCUMENT_UPLOADED', ?, ?)`,
        )
        .bind(
          randomUUID(),
          document.organizationId,
          document.dossierId,
          actor.userId,
          `Document ajouté : ${document.fileName}`,
          JSON.stringify({ documentId: document.id, kind: document.kind }),
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) VALUES (?, ?, ?, 'DOCUMENT_UPLOADED', 'DOCUMENT', ?, ?)`,
        )
        .bind(
          randomUUID(),
          document.organizationId,
          actor.userId,
          document.id,
          JSON.stringify({ dossierId: document.dossierId, kind: document.kind }),
        ),
    ]);
  }

  async markQuarantined(documentId: string, reason: string): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE documents SET status = 'QUARANTINED', updated_at = unixepoch()
           WHERE id = ? AND status = 'PENDING'`,
        )
        .bind(documentId),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, action, resource_type, resource_id, metadata_json
           ) SELECT ?, organization_id, 'DOCUMENT_QUARANTINED', 'DOCUMENT', id, ?
             FROM documents WHERE id = ?`,
        )
        .bind(randomUUID(), JSON.stringify({ reason }), documentId),
    ]);
  }

  private findById(documentId: string): Promise<DocumentRow | null> {
    return this.database
      .prepare(`SELECT * FROM documents WHERE id = ? LIMIT 1`)
      .bind(documentId)
      .first<DocumentRow>();
  }

  private selectSql(): string {
    return `SELECT document.*
      FROM documents document
      JOIN dossiers dossier ON dossier.id = document.dossier_id
      JOIN organizations resource_org ON resource_org.id = dossier.organization_id`;
  }

  private map(row: DocumentRow): DocumentRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      dossierId: row.dossier_id,
      kind: row.kind,
      r2Key: row.r2_key,
      fileName: row.file_name,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      sha256: row.sha256,
      status: row.status,
      uploadedByUserId: row.uploaded_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

