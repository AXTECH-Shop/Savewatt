import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DocumentStorageManager } from "@/lib/cloudflare/document-storage-manager";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { DocumentRepository } from "@/lib/documents/document-repository";
import { CrmError } from "@/lib/crm/crm-errors";
import { extractBill } from "./gemini";
import { ExtractionRepository, type ExtractionRecord } from "./extraction-repository";
import type { ExtractionResult } from "./schema";

const EXTRACTABLE_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_EXTRACTABLE_BYTES = 10 * 1024 * 1024;

export class ExtractionManager {
  constructor(
    private readonly documents = new DocumentRepository(),
    private readonly extractions = new ExtractionRepository(),
    private readonly database: D1Database = DatabaseManager.getDatabase(),
  ) {}

  async listForDocument(actor: WorkspaceActor, documentId: string): Promise<ExtractionRecord[]> {
    return this.extractions.listForDocument(actor, documentId);
  }

  async run(actor: WorkspaceActor, documentId: string): Promise<ExtractionRecord> {
    const document = await this.documents.find(actor, documentId);
    if (!document) throw new CrmError("CRM_NOT_FOUND", 404);
    if (!EXTRACTABLE_MIME_TYPES.includes(document.mimeType)) {
      throw new CrmError("CRM_INVALID_INPUT", 415, "document");
    }
    if (document.byteSize > MAX_EXTRACTABLE_BYTES) {
      throw new CrmError("CRM_INVALID_INPUT", 413, "document");
    }

    const object = await DocumentStorageManager.getBucket().get(document.r2Key);
    if (!object) throw new CrmError("CRM_NOT_FOUND", 404);
    const bytes = await new Response(object.body).arrayBuffer();
    const data = Buffer.from(bytes).toString("base64");

    const result = await extractBill({ data, mimeType: document.mimeType });
    const extraction = await this.extractions.create(actor, {
      documentId: document.id,
      dossierId: document.dossierId,
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      result,
    });
    await this.recordEvent(actor, document.dossierId, "EXTRACTION_COMPLETED", {
      documentId: document.id,
      extractionId: extraction.id,
      confidence: result.overallConfidence,
      warnings: result.warnings,
    });
    return extraction;
  }

  async saveValidated(
    actor: WorkspaceActor,
    extractionId: string,
    validated: ExtractionResult,
  ): Promise<ExtractionRecord> {
    const extraction = await this.extractions.find(actor, extractionId);
    if (!extraction) throw new CrmError("CRM_NOT_FOUND", 404);
    const updated = await this.extractions.saveValidated(actor, extractionId, validated);
    await this.recordEvent(actor, extraction.dossierId, "EXTRACTION_VALIDATED", {
      documentId: extraction.documentId,
      extractionId,
    });
    return updated;
  }

  private async recordEvent(
    actor: WorkspaceActor,
    dossierId: string,
    eventType: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO dossier_events (
           id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        randomUUID(),
        actor.orgId,
        dossierId,
        actor.userId,
        eventType,
        eventType === "EXTRACTION_COMPLETED" ? "Facture analysée automatiquement" : "Données de facture validées",
        JSON.stringify(metadata),
      )
      .run();
  }
}
