import type { ExtractedBill } from "../extraction/schema";
import type { Cadran, CurrentContract, ProposedLine } from "../types";
import {
  computeBudgetPrevisionnel,
  type BudgetPrevisionnel,
  type ConsumptionProfile,
  type PricingParameterValues,
  type SeasonalCadran,
} from "./estimate.ts";

/**
 * The fixed pricing mechanism. Every rate comes from configuration (pricing
 * parameters, Symphonics terms, margin grid); only the rules live here.
 * Pure — shared by the platform, the intake pipeline and the MCP server.
 */

/** Connections up to 36 kVA (segment C5) use the small-site network rates and excise. */
export const SMALL_SITE_MAX_KVA = 36;

export interface SiteContext {
  segment?: string | null;
  powerKva?: number | null;
}

const WINTER_MONTHS = new Set([10, 11, 0, 1, 2]);
const round2 = (value: number) => Math.round(value * 100) / 100;

export function isSmallSite(site: SiteContext): boolean {
  if (site.segment) return site.segment === "C5";
  return site.powerKva != null && site.powerKva > 0 && site.powerKva <= SMALL_SITE_MAX_KVA;
}

/** Pricing parameters with the small-site network rates and excise applied when relevant. */
export function ratesForSite(params: PricingParameterValues, site: SiteContext): PricingParameterValues {
  const small = params.smallSiteRates;
  if (!small || !isSmallSite(site)) return params;
  return { ...params, acciseEurMwh: small.acciseEurMwh, turpeFixed: small.turpeFixed, turpeVariable: small.turpeVariable };
}

/**
 * Current contract with an all-in supply price per bill line: energy price
 * after any promotion, plus the supplier's per-kWh charges (CEE, capacity…)
 * so it compares like-for-like with électron + CEE + capacity.
 */
export function currentContractFromBill(bill: ExtractedBill): CurrentContract {
  const adders = (bill.supplyCharges ?? []).reduce((sum, charge) => sum + (charge.unitPriceEurMwh ?? 0), 0);
  const discount = Math.min(Math.max(bill.consumptionDiscountPct ?? 0, 0), 100) / 100;
  return {
    supplier: bill.supplier ?? "",
    offerName: bill.offerName ?? "",
    endDate: bill.contractEndDate,
    subscriptionEurMonth: bill.subscriptionEurPerMonth ?? 0,
    subscribedPowerKva: bill.subscribedPowerKva,
    segment: bill.segment,
    lines: bill.consumption
      .filter((line) => line.unitPriceEurMwh !== null)
      .map((line) => ({
        cadran: line.cadran as Cadran,
        unitPriceEurMwh: round2((line.unitPriceEurMwh ?? 0) * (1 - discount) + adders),
        volumeMwh: line.volumeKwh !== null ? line.volumeKwh / 1000 : 0,
      })),
  };
}

/** Budget prévisionnel from the Symphonics quote (its CEE and capacity) and the site's network rates. */
export function budgetForOffer(input: {
  lines: ProposedLine[];
  marginEurMwh: number;
  subscriptionEurMonth: number;
  ceeEurMwh: number;
  capacityEurMwh: number;
  termYears: number;
  params: PricingParameterValues;
  site: SiteContext;
}): BudgetPrevisionnel {
  const rates = ratesForSite(input.params, input.site);
  return computeBudgetPrevisionnel({
    lines: input.lines.map((line) => ({
      cadran: line.cadran,
      annualVolumeMwh: line.annualVolumeMwh,
      finalPriceEurMwh: line.electronEurMwh + input.marginEurMwh,
    })),
    subscriptionEurMonth: input.subscriptionEurMonth,
    params: { ...rates, ceeEurMwh: input.ceeEurMwh, capacityEurMwh: input.capacityEurMwh },
    powerKw: input.site.powerKva ?? 0,
    termYears: input.termYears,
  });
}

function shares(profile: ConsumptionProfile): ConsumptionProfile | null {
  const total = profile.HPH + profile.HCH + profile.HPE + profile.HCE;
  if (!(total > 0)) return null;
  return { HPH: profile.HPH / total, HCH: profile.HCH / total, HPE: profile.HPE / total, HCE: profile.HCE / total };
}

/**
 * Share of a year's consumption billed between two dates (inclusive), weighting
 * winter days (Nov–Mar) and summer days (Apr–Oct) by the profile.
 */
export function profileCoverage(start: string, end: string, profile: ConsumptionProfile): number | null {
  const normalized = shares(profile);
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (!normalized || !Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  const winterShare = normalized.HPH + normalized.HCH;
  const summerShare = 1 - winterShare;
  let coverage = 0;
  for (let day = from; day <= to; day += 86_400_000) {
    coverage += WINTER_MONTHS.has(new Date(day).getUTCMonth()) ? winterShare / 151 : summerShare / 214;
  }
  return coverage;
}

/** Base / HP / HC annual volumes → the four seasonal cadrans, by profile. */
export function splitFlatVolumes(
  annual: { cadran: Cadran; annualVolumeMwh: number }[],
  profile: ConsumptionProfile,
): { cadran: SeasonalCadran; annualVolumeMwh: number }[] | null {
  const p = shares(profile);
  if (!p) return null;
  const out: Record<SeasonalCadran, number> = { HPH: 0, HCH: 0, HPE: 0, HCE: 0 };
  for (const line of annual) {
    const volume = line.annualVolumeMwh;
    if (line.cadran === "BASE") {
      for (const cadran of ["HPH", "HCH", "HPE", "HCE"] as SeasonalCadran[]) out[cadran] += volume * p[cadran];
    } else if (line.cadran === "HP") {
      const winter = p.HPH + p.HPE > 0 ? p.HPH / (p.HPH + p.HPE) : 0;
      out.HPH += volume * winter;
      out.HPE += volume * (1 - winter);
    } else if (line.cadran === "HC") {
      const winter = p.HCH + p.HCE > 0 ? p.HCH / (p.HCH + p.HCE) : 0;
      out.HCH += volume * winter;
      out.HCE += volume * (1 - winter);
    } else {
      return null;
    }
  }
  return (["HPH", "HCH", "HPE", "HCE"] as SeasonalCadran[])
    .map((cadran) => ({ cadran, annualVolumeMwh: out[cadran] }))
    .filter((line) => line.annualVolumeMwh > 0);
}
