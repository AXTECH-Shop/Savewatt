import { deriveAnnualCadranVolumes, type SeasonalCadran } from "../offers/estimate.ts";
import type { ExtractionResult } from "../extraction/schema";
import type { Cadran } from "../types";

/**
 * Bill → Symphonics supplier-offer plan. Pure (no I/O) so the auto-send rules
 * that decide whether a customer gets an offer without a human are testable.
 */

export const SEASONAL_CADRANS: SeasonalCadran[] = ["HPH", "HCH", "HPE", "HCE"];

export interface ReferenceTerms {
  termYears: number;
  subscriptionEurMonth: number;
  validUntil: string;
  prices: Partial<Record<SeasonalCadran, number>>;
  autoSend: boolean;
  minConfidence: number;
}

export interface PlannedLine {
  cadran: Cadran;
  annualVolumeMwh: number;
  electronEurMwh: number | null;
}

export interface IntakePlan {
  validUntil: string | null;
  termYears: number;
  ceeEurMwh: number;
  capacityEurMwh: number;
  subscriptionEurMonth: number;
  volumeBasis: "ANNUAL_REFERENCE" | "PERIOD" | "UNANNUALIZED";
  monthsCovered: number | null;
  lines: PlannedLine[];
}

export const INTAKE_ISSUES = [
  "EXTRACTION_FAILED",
  "LOW_CONFIDENCE",
  "PDL_MISSING",
  "POWER_MISSING",
  "UNSUPPORTED_TARIFF",
  "NO_PRICED_CONSUMPTION",
  "PERIOD_UNKNOWN",
  "REFERENCE_TERMS_MISSING",
  "REFERENCE_PRICE_MISSING",
  "REFERENCE_EXPIRED",
  "AUTO_SEND_DISABLED",
  "CONTACT_EMAIL_MISSING",
  "DUPLICATE_PDL",
  "NO_SAVING",
  "APPROVAL_REQUIRED",
  "PROCESSING_ERROR",
] as const;
export type IntakeIssue = (typeof INTAKE_ISSUES)[number];

const DAY_MS = 86_400_000;
const ETE_MONTHS = 7;
const WINTER_MONTHS = 5;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Months covered by the bill's consumption periods (null when undated). */
export function monthsCovered(result: ExtractionResult): number | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const line of result.bill.consumption) {
    const start = line.periodStart ? Date.parse(line.periodStart) : Number.NaN;
    const end = line.periodEnd ? Date.parse(line.periodEnd) : Number.NaN;
    if (Number.isFinite(start)) starts.push(start);
    if (Number.isFinite(end)) ends.push(end);
  }
  if (!starts.length || !ends.length) return null;
  const days = (Math.max(...ends) - Math.min(...starts)) / DAY_MS + 1;
  if (days < 7) return null;
  return Math.min(12, Math.round((days / 30.4375) * 100) / 100);
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Annual volumes per cadran plus the reference electron prices. The CAR
 * (annual reference consumption) is preferred over annualizing the billed
 * period, because one month × 12 ignores seasonality.
 */
export function planIntakeOffer(input: {
  result: ExtractionResult;
  reference: ReferenceTerms | null;
  passThrough: { ceeEurMwh: number; capacityEurMwh: number };
}): { plan: IntakePlan; issues: IntakeIssue[] } {
  const { result, reference } = input;
  const issues: IntakeIssue[] = [];
  const observed = result.bill.consumption
    .filter((line) => (line.volumeKwh ?? 0) > 0)
    .map((line) => ({ cadran: line.cadran as Cadran, volumeMwh: (line.volumeKwh ?? 0) / 1000 }));
  if (!result.bill.consumption.some((line) => (line.volumeKwh ?? 0) > 0 && line.unitPriceEurMwh !== null)) {
    issues.push("NO_PRICED_CONSUMPTION");
  }
  const seasonalOnly = observed.every((line) => SEASONAL_CADRANS.includes(line.cadran as SeasonalCadran));
  if (!seasonalOnly) issues.push("UNSUPPORTED_TARIFF");

  const months = monthsCovered(result);
  const referenceMwh = (result.bill.annualReferenceKwh ?? 0) / 1000;
  let volumeBasis: IntakePlan["volumeBasis"];
  let lines: { cadran: Cadran; annualVolumeMwh: number }[];

  if (seasonalOnly && observed.length) {
    // Été cadrans only occur ~7 months a year and hiver ~5: a single-season
    // bill is annualized over its season, not over 12 months.
    const cadrans = new Set(observed.map((line) => line.cadran));
    const winterOnly = !cadrans.has("HPE") && !cadrans.has("HCE");
    const eteOnly = !cadrans.has("HPH") && !cadrans.has("HCH");
    const seasonMonths = eteOnly ? ETE_MONTHS : winterOnly ? WINTER_MONTHS : 12;
    lines = deriveAnnualCadranVolumes(observed, months ? Math.min(12, (months * 12) / seasonMonths) : 12);
  } else {
    const merged = new Map<Cadran, number>();
    for (const line of observed) merged.set(line.cadran, (merged.get(line.cadran) ?? 0) + line.volumeMwh);
    const scale = months ? 12 / months : 1;
    lines = [...merged].map(([cadran, volume]) => ({ cadran, annualVolumeMwh: volume * scale }));
  }

  const total = lines.reduce((sum, line) => sum + line.annualVolumeMwh, 0);
  if (referenceMwh > 0 && total > 0) {
    volumeBasis = "ANNUAL_REFERENCE";
    lines = lines.map((line) => ({ ...line, annualVolumeMwh: (line.annualVolumeMwh / total) * referenceMwh }));
  } else if (months) {
    volumeBasis = "PERIOD";
  } else {
    volumeBasis = "UNANNUALIZED";
    issues.push("PERIOD_UNKNOWN");
  }

  if (!reference) issues.push("REFERENCE_TERMS_MISSING");
  const planned: PlannedLine[] = lines.map((line) => ({
    cadran: line.cadran,
    annualVolumeMwh: round3(line.annualVolumeMwh),
    electronEurMwh: reference?.prices[line.cadran as SeasonalCadran] ?? null,
  }));
  if (reference && planned.some((line) => line.electronEurMwh === null)) issues.push("REFERENCE_PRICE_MISSING");

  return {
    plan: {
      validUntil: reference?.validUntil ?? null,
      termYears: reference?.termYears ?? 3,
      ceeEurMwh: input.passThrough.ceeEurMwh,
      capacityEurMwh: input.passThrough.capacityEurMwh,
      subscriptionEurMonth: reference?.subscriptionEurMonth ?? 0,
      volumeBasis,
      monthsCovered: months,
      lines: planned,
    },
    issues,
  };
}

/** Everything that must hold before an offer is emailed with no human review. */
export function autoSendIssues(input: {
  result: ExtractionResult;
  reference: ReferenceTerms | null;
  planIssues: IntakeIssue[];
  contactEmail: string | null;
  today: string;
}): IntakeIssue[] {
  const { result, reference } = input;
  const issues = new Set<IntakeIssue>(input.planIssues);
  if (result.overallConfidence < (reference?.minConfidence ?? 0.8)) issues.add("LOW_CONFIDENCE");
  if (!/^\d{14}$/.test(result.bill.pdlOrPrm ?? "")) issues.add("PDL_MISSING");
  if (!result.bill.subscribedPowerKva) issues.add("POWER_MISSING");
  if (reference && !reference.autoSend) issues.add("AUTO_SEND_DISABLED");
  if (reference) {
    const minimumValidity = new Date(Date.parse(input.today) + 2 * DAY_MS).toISOString().slice(0, 10);
    if (reference.validUntil < minimumValidity) issues.add("REFERENCE_EXPIRED");
  }
  if (!EMAIL_PATTERN.test(input.contactEmail ?? "")) issues.add("CONTACT_EMAIL_MISSING");
  return INTAKE_ISSUES.filter((issue) => issues.has(issue));
}
