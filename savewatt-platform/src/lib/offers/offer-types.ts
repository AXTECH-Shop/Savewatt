import type { ComparisonResult } from "@/lib/compare";
import type { CurrentContract, ProposedLine, Proposal } from "@/lib/types";

export interface SupplierOfferRecord {
  id: string;
  organizationId: string;
  dossierId: string;
  validUntil: string | null;
  termYears: number;
  ceeEurMwh: number;
  capacityEurMwh: number;
  subscriptionEurMonth: number;
  sourceDocumentId: string | null;
  createdAt: number;
  updatedAt: number;
  lines: ProposedLine[];
}

export interface SaveSupplierOfferInput {
  validUntil?: string | null;
  termYears: number;
  ceeEurMwh: number;
  capacityEurMwh: number;
  subscriptionEurMonth: number;
  sourceDocumentId?: string | null;
  lines: ProposedLine[];
}

export interface MarginGridRecord {
  id: string;
  organizationId: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  minMarginEurMwh: number;
  defaultMarginEurMwh: number;
  maxMarginEurMwh: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: number;
}

export type OfferVersionStatus =
  | "DRAFT"
  | "APPROVAL_REQUIRED"
  | "APPROVED"
  | "SENT"
  | "EXPIRED"
  | "REVOKED";

export interface ClientPriceLine {
  cadran: string;
  priceEurMwh: number;
}

export interface OfferVersionRecord {
  id: string;
  organizationId: string;
  dossierId: string;
  versionNo: number;
  status: OfferVersionStatus;
  currentContract: CurrentContract;
  supplierOffer: Proposal;
  marginEurMwh: number;
  marginOverrideReason: string | null;
  comparison: ComparisonResult;
  clientPriceLines: ClientPriceLine[];
  sha256: string;
  pdfR2Key: string | null;
  pdfSha256: string | null;
  createdAt: number;
}
