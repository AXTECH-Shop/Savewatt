export const UPLOADABLE_DOCUMENT_KINDS = [
  "BILL",
  "CURRENT_CONTRACT",
  "SUPPLIER_OFFER",
] as const;

export type UploadableDocumentKind = (typeof UPLOADABLE_DOCUMENT_KINDS)[number];

export interface DocumentRecord {
  id: string;
  organizationId: string;
  dossierId: string;
  kind: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  status: "PENDING" | "AVAILABLE" | "QUARANTINED" | "ARCHIVED";
  uploadedByUserId: string | null;
  createdAt: number;
  updatedAt: number;
}

