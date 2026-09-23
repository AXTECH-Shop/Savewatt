import { createHash } from "node:crypto";
import type { ComparisonResult } from "@/lib/compare";
import type { CurrentContract, Proposal } from "@/lib/types";
import type { ClientPriceLine } from "./offer-types";

export interface OfferVersionSnapshotInput {
  dossierId: string;
  versionNo: number;
  currentContract: CurrentContract;
  supplierOffer: Proposal;
  marginEurMwh: number;
  marginOverrideReason: string | null;
  comparison: ComparisonResult;
  clientPriceLines: ClientPriceLine[];
}

/**
 * Canonical SHA-256 over every input that defines an offer version.
 * Regenerating the same version from the same snapshot must reproduce
 * the exact same hash (blueprint §11 reproducibility gate).
 */
export function hashOfferSnapshot(snapshot: OfferVersionSnapshotInput): string {
  const canonical = JSON.stringify({
    dossierId: snapshot.dossierId,
    versionNo: snapshot.versionNo,
    currentContract: snapshot.currentContract,
    supplierOffer: snapshot.supplierOffer,
    marginEurMwh: snapshot.marginEurMwh,
    marginOverrideReason: snapshot.marginOverrideReason,
    comparison: snapshot.comparison,
    clientPriceLines: snapshot.clientPriceLines,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
