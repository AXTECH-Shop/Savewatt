import type { ComparisonResult } from "@/lib/compare";
import type { CurrentContract, ProposedLine, Proposal } from "@/lib/types";
import type { BudgetPrevisionnel, PricingParameterValues } from "./estimate";

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

export type MarginGridRoleScope = "ADMIN" | "REGIE";

export interface MarginGridRecord {
  id: string;
  organizationId: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  roleScope: MarginGridRoleScope;
  minMarginEurMwh: number;
  defaultMarginEurMwh: number;
  maxMarginEurMwh: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: number;
  /** Display name of the author (history listings only). */
  createdBy?: string | null;
}

export interface PricingParameterRecord extends PricingParameterValues {
  id: string;
  organizationId: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: number;
  /** Display name of the author (history listings only). */
  createdBy?: string | null;
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
  budget: BudgetPrevisionnel | null;
  sha256: string;
  pdfR2Key: string | null;
  pdfSha256: string | null;
  pdfMarketingR2Key: string | null;
  pdfMarketingSha256: string | null;
  createdAt: number;
}
