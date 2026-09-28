import type { Cadran, ExtractedBill, ExtractionResult, PriceUnit, SubscriptionUnit } from "./schema";

/** Convert a printed per-kWh price to €/MWh. */
export function priceToEurMwh(value: number | null, unit: PriceUnit | null): number | null {
  if (value == null || unit == null) return null;
  switch (unit) {
    case "€/MWh":
      return value;
    case "€/kWh":
      return value * 1000; // 0.09707 €/kWh → 97.07 €/MWh
    case "c€/kWh":
      return value * 10; // 19.095 c€/kWh → 190.95 €/MWh
    default:
      return null;
  }
}

/** Convert a printed subscription to €/month. */
export function subscriptionToMonthly(
  value: number | null,
  unit: SubscriptionUnit | null,
): number | null {
  if (value == null || unit == null) return null;
  return unit === "€/an" ? value / 12 : value;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const OPTION_CADRANS: Record<string, Cadran[]> = { BASE: ["BASE"], "HP/HC": ["HP", "HC"] };

/**
 * Deterministic safety net over the model's own unit normalization: recompute
 * €/MWh and €/month from the raw printed value + unit whenever they're missing,
 * so the comparator never sees a supplier-specific unit.
 */
export function normalizeBill(bill: ExtractedBill): ExtractedBill {
  // A Base or HP/HC supply never bills seasonal energy bands: seasonal lines there are network (TURPE) lines.
  const allowed = OPTION_CADRANS[bill.optionTarifaire ?? ""];
  const energyLines =
    allowed && bill.consumption.some((line) => allowed.includes(line.cadran))
      ? bill.consumption.filter((line) => allowed.includes(line.cadran))
      : bill.consumption;
  const consumption = energyLines.map((line) => {
    const derived = priceToEurMwh(line.unitPricePrinted, line.unitPricePrintedUnit);
    return {
      ...line,
      unitPriceEurMwh:
        line.unitPriceEurMwh ?? (derived != null ? round2(derived) : null),
    };
  });

  const derivedMonthly = subscriptionToMonthly(
    bill.subscriptionPrinted,
    bill.subscriptionPrintedUnit,
  );

  const supplyCharges = (bill.supplyCharges ?? []).map((charge) => {
    const derived = priceToEurMwh(charge.unitPricePrinted, charge.unitPricePrintedUnit);
    return { ...charge, unitPriceEurMwh: charge.unitPriceEurMwh ?? (derived != null ? round2(derived) : null) };
  });

  return {
    ...bill,
    consumption,
    supplyCharges,
    consumptionDiscountPct: bill.consumptionDiscountPct ?? null,
    subscriptionEurPerMonth:
      bill.subscriptionEurPerMonth ??
      (derivedMonthly != null ? round2(derivedMonthly) : null),
  };
}

/** Apply deterministic normalization to a full extraction result. */
export function normalizeResult(result: ExtractionResult): ExtractionResult {
  return { ...result, bill: normalizeBill(result.bill) };
}
