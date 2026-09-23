import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DocumentStorageManager } from "@/lib/cloudflare/document-storage-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { DocumentRepository } from "./document-repository";
import type { DocumentRecord } from "./document-types";
import { DocumentValidationManager } from "./document-validation-manager";

export interface OpenDocumentResult {
  document: DocumentRecord;
  object: R2ObjectBody;
}

export class DocumentManager {
  constructor(
    private readonly repository = new DocumentRepository(),
    private readonly bucket: R2Bucket = DocumentStorageManager.getBucket(),
    private readonly validation = new DocumentValidationManager(),
  ) {}

  list(actor: WorkspaceActor, dossierId: string) {
    return this.repository.list(actor, dossierId);
  }

  async upload(
    actor: WorkspaceActor,
    dossierId: string,
    kindValue: unknown,
    file: File,
  ): Promise<DocumentRecord> {
    const kind = this.validation.kind(kindValue);
    this.validation.file(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    this.validation.magicBytes(bytes, file.type);
    const fileName = this.validation.safeFileName(file.name);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const r2Key = `organizations/${actor.orgId}/dossiers/${dossierId}/${randomUUID()}-${fileName}`;
    const document = await this.repository.createPending(actor, {
      dossierId,
      kind,
      r2Key,
      fileName,
      mimeType: file.type,
      byteSize: file.size,
      sha256,
    });

    let objectStored = false;
    try {
      await this.bucket.put(r2Key, bytes, {
        httpMetadata: { contentType: file.type },
        customMetadata: {
          documentId: document.id,
          dossierId,
          sha256,
        },
      });
      objectStored = true;
      await this.repository.markAvailable(actor, document);
    } catch (error) {
      if (objectStored) await this.bucket.delete(r2Key).catch(() => undefined);
      const reason = error instanceof Error ? error.message : "R2_UPLOAD_FAILED";
      await this.repository.markQuarantined(document.id, reason);
      throw new CrmError("CRM_UNAVAILABLE", 503, "documentStorage");
    }

    const available = await this.repository.find(actor, document.id);
    if (!available) throw new CrmError("CRM_UNAVAILABLE", 503, "documentStorage");
    return available;
  }

  async open(actor: WorkspaceActor, documentId: string): Promise<OpenDocumentResult> {
    const document = await this.repository.find(actor, documentId);
    if (!document) throw new CrmError("CRM_NOT_FOUND", 404);
    const object = await this.bucket.get(document.r2Key);
    if (!object) throw new CrmError("CRM_NOT_FOUND", 404);
    return { document, object };
  }
}
