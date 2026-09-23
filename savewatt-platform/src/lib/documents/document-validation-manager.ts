import { CrmError } from "../crm/crm-errors.ts";
import {
  UPLOADABLE_DOCUMENT_KINDS,
  type UploadableDocumentKind,
} from "./document-types.ts";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export class DocumentValidationManager {
  kind(value: unknown): UploadableDocumentKind {
    if (
      typeof value !== "string" ||
      !UPLOADABLE_DOCUMENT_KINDS.includes(value as UploadableDocumentKind)
    ) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "kind");
    }
    return value as UploadableDocumentKind;
  }

  file(file: File): void {
    if (file.size <= 0 || file.size > MAX_BYTES) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "fileSize");
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new CrmError("CRM_INVALID_INPUT", 415, "mimeType");
    }
  }

  magicBytes(bytes: Uint8Array, mimeType: string): void {
    const valid =
      (mimeType === "application/pdf" && this.startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) ||
      (mimeType === "image/png" && this.startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) ||
      (mimeType === "image/jpeg" && this.startsWith(bytes, [0xff, 0xd8, 0xff])) ||
      (mimeType === "image/webp" &&
        this.ascii(bytes, 0, 4) === "RIFF" &&
        this.ascii(bytes, 8, 12) === "WEBP");
    if (!valid) throw new CrmError("CRM_INVALID_INPUT", 415, "fileContent");
  }

  safeFileName(value: string): string {
    const normalized = value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 160);
    return normalized || "document";
  }

  private startsWith(bytes: Uint8Array, signature: number[]): boolean {
    return signature.every((value, index) => bytes[index] === value);
  }

  private ascii(bytes: Uint8Array, start: number, end: number): string {
    return String.fromCharCode(...bytes.slice(start, end));
  }
}
