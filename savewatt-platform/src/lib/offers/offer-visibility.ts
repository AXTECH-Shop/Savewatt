import type { AppRole } from "@/lib/access-control";
import type { ProposedLine } from "@/lib/types";
import type {
  MarginGridRecord,
  OfferVersionRecord,
  SupplierOfferRecord,
} from "./offer-types";

/**
 * Régie visibility: the régie network (every role outside the SaveWatt
 * operator set) sees and shares final prices only. Buy price (électron),
 * CEE/capacity components, margin, and margin-grid bounds are stripped at the
 * API layer by explicit field whitelisting — secrecy by construction, same
 * rule as offer-pdf.ts.
 */

const INTERNAL_PRICING_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "OPERATOR_FINANCE"];

export function canSeeInternalPricing(role: AppRole): boolean {
  return INTERNAL_PRICING_ROLES.includes(role);
}

export function isRegieRole(role: AppRole): boolean {
  return !canSeeInternalPricing(role);
}

export type RegieSupplierOfferLine = Omit<ProposedLine, "electronEurMwh">;
export type SupplierOfferView =
  | SupplierOfferRecord
  | (Omit<SupplierOfferRecord, "ceeEurMwh" | "capacityEurMwh" | "lines"> & {
      lines: RegieSupplierOfferLine[];
    });

export function serializeSupplierOfferForActor(
  actor: { role: AppRole },
  offer: SupplierOfferRecord | null,
): SupplierOfferView | null {
  if (!offer || canSeeInternalPricing(actor.role)) return offer;
  return {
    id: offer.id,
    organizationId: offer.organizationId,
    dossierId: offer.dossierId,
    validUntil: offer.validUntil,
    termYears: offer.termYears,
    subscriptionEurMonth: offer.subscriptionEurMonth,
    sourceDocumentId: offer.sourceDocumentId,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    lines: offer.lines.map((line) => ({
      cadran: line.cadran,
      annualVolumeMwh: line.annualVolumeMwh,
    })),
  };
}

export type RegieProposalLine = Omit<ProposedLine, "electronEurMwh">;
export type RegieProposal = Omit<
  OfferVersionRecord["supplierOffer"],
  "ceeEurMwh" | "capacityEurMwh" | "marginEurMwh" | "lines"
> & { lines: RegieProposalLine[] };
export type OfferVersionView =
  | OfferVersionRecord
  | (Omit<OfferVersionRecord, "marginEurMwh" | "marginOverrideReason" | "supplierOffer"> & {
      supplierOffer: RegieProposal;
    });

export function serializeOfferVersionForActor(
  actor: { role: AppRole },
  version: OfferVersionRecord,
): OfferVersionView {
  if (canSeeInternalPricing(actor.role)) return version;
  const offer = version.supplierOffer;
  return {
    id: version.id,
    organizationId: version.organizationId,
    dossierId: version.dossierId,
    versionNo: version.versionNo,
    status: version.status,
    currentContract: version.currentContract,
    comparison: version.comparison,
    clientPriceLines: version.clientPriceLines,
    budget: version.budget,
    sha256: version.sha256,
    pdfR2Key: version.pdfR2Key,
    pdfSha256: version.pdfSha256,
    pdfMarketingR2Key: version.pdfMarketingR2Key,
    pdfMarketingSha256: version.pdfMarketingSha256,
    createdAt: version.createdAt,
    supplierOffer: {
      supplier: offer.supplier,
      subscriptionEurMonth: offer.subscriptionEurMonth,
      validUntil: offer.validUntil,
      termYears: offer.termYears,
      lines: offer.lines.map((line) => ({
        cadran: line.cadran,
        annualVolumeMwh: line.annualVolumeMwh,
      })),
    },
  };
}

export type MarginGridView =
  | MarginGridRecord
  | Omit<
      MarginGridRecord,
      "minMarginEurMwh" | "defaultMarginEurMwh" | "maxMarginEurMwh"
    >;

export function serializeMarginGridForActor(
  actor: { role: AppRole },
  grid: MarginGridRecord | null,
): MarginGridView | null {
  if (!grid || canSeeInternalPricing(actor.role)) return grid;
  return {
    id: grid.id,
    organizationId: grid.organizationId,
    version: grid.version,
    status: grid.status,
    roleScope: grid.roleScope,
    effectiveFrom: grid.effectiveFrom,
    effectiveTo: grid.effectiveTo,
    createdAt: grid.createdAt,
  };
}
