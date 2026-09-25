import type { Cadran } from "@/lib/types";

/**
 * Symphonics-style "budget prévisionnel" engine — pure functions, no I/O.
 * Formulas and the rounding convention (round each component total to the
 * nearest euro, keep per-line amounts at cent precision) are validated against
 * the Josh / AX TECH proposal; see specs/symphonics-pricing-model.md.
 */

export type SeasonalCadran = "HPH" | "HCH" | "HPE" | "HCE";

export interface TurpeFixedRates {
  gestionCentsPerDay: number;
  comptageCentsPerDay: number;
  soutirageFixeCentsPerKwPerDay: number;
}

/** Per-cadran TURPE variable rates in c€/kWh. */
export type TurpeVariableRates = Partial<Record<SeasonalCadran, number>>;

export interface PricingParameterValues {
  ceeEurMwh: number;
  capacityEurMwh: number;
  acciseEurMwh: number;
  ctaRate: number;
  tvaRate: number;
  turpeFixed: TurpeFixedRates;
  turpeVariable: TurpeVariableRates;
}

export interface BudgetInputLine {
  cadran: Cadran;
  annualVolumeMwh: number;
  /** Client-facing final price (électron + margin) — buy price never enters here alone. */
  finalPriceEurMwh: number;
}

export interface BudgetInput {
  lines: BudgetInputLine[];
  subscriptionEurMonth: number;
  params: PricingParameterValues;
  powerKw: number;
  termYears: number;
}

export interface BudgetAmountLine {
  cadran: Cadran;
  volumeMwh: number;
  rateEurMwh: number;
  amountEur: number;
}

export interface TurpeVariableLine {
  cadran: SeasonalCadran;
  volumeMwh: number;
  rateCentsPerKwh: number;
  amountEur: number;
}

export interface BudgetPrevisionnel {
  currency: "EUR";
  daysPerYear: number;
  energy: { lines: BudgetAmountLine[]; totalEur: number };
  subscription: { monthlyEur: number; totalEur: number };
  cee: { rateEurMwh: number; volumeMwh: number; totalEur: number };
  capacity: { rateEurMwh: number; volumeMwh: number; totalEur: number };
  acheminement: {
    fixed: {
      gestionEur: number;
      comptageEur: number;
      soutirageFixeEur: number;
      totalEur: number;
    };
    variable: { lines: TurpeVariableLine[]; totalEur: number };
    totalEur: number;
  };
  accise: { rateEurMwh: number; volumeMwh: number; totalEur: number };
  cta: { rate: number; baseEur: number; totalEur: number };
  totalHtEur: number;
  tva: { rate: number; totalEur: number };
  totalTtcEur: number;
  termYears: number;
  termTotalTtcEur: number;
  warnings: string[];
}

const DAYS_PER_YEAR = 365;

const roundEur = (value: number): number => Math.round(value);
const roundCent = (value: number): number => Math.round(value * 100) / 100;

export function computeBudgetPrevisionnel(input: BudgetInput): BudgetPrevisionnel {
  const { params } = input;
  const totalVolumeMwh = input.lines.reduce((sum, line) => sum + line.annualVolumeMwh, 0);
  const warnings: string[] = [];

  const energyLines: BudgetAmountLine[] = input.lines.map((line) => ({
    cadran: line.cadran,
    volumeMwh: line.annualVolumeMwh,
    rateEurMwh: line.finalPriceEurMwh,
    amountEur: roundCent(line.annualVolumeMwh * line.finalPriceEurMwh),
  }));
  const energyTotal = roundEur(
    input.lines.reduce((sum, line) => sum + line.annualVolumeMwh * line.finalPriceEurMwh, 0),
  );

  const subscriptionTotal = roundEur(12 * input.subscriptionEurMonth);
  const ceeTotal = roundEur(totalVolumeMwh * params.ceeEurMwh);
  const capacityTotal = roundEur(totalVolumeMwh * params.capacityEurMwh);
  const acciseTotal = roundEur(totalVolumeMwh * params.acciseEurMwh);

  const gestionEur = roundCent((params.turpeFixed.gestionCentsPerDay * DAYS_PER_YEAR) / 100);
  const comptageEur = roundCent((params.turpeFixed.comptageCentsPerDay * DAYS_PER_YEAR) / 100);
  const soutirageFixeEur = roundCent(
    (params.turpeFixed.soutirageFixeCentsPerKwPerDay * input.powerKw * DAYS_PER_YEAR) / 100,
  );
  const turpeFixedTotal = roundEur(gestionEur + comptageEur + soutirageFixeEur);

  const turpeVariableLines: TurpeVariableLine[] = [];
  for (const line of input.lines) {
    const rate = params.turpeVariable[line.cadran as SeasonalCadran];
    if (rate === undefined) {
      if (line.annualVolumeMwh > 0) {
        warnings.push(`TURPE_VARIABLE_RATE_MISSING:${line.cadran}`);
      }
      continue;
    }
    turpeVariableLines.push({
      cadran: line.cadran as SeasonalCadran,
      volumeMwh: line.annualVolumeMwh,
      rateCentsPerKwh: rate,
      amountEur: roundCent((line.annualVolumeMwh * 1000 * rate) / 100),
    });
  }
  const turpeVariableTotal = roundEur(
    turpeVariableLines.reduce(
      (sum, line) => sum + (line.volumeMwh * 1000 * line.rateCentsPerKwh) / 100,
      0,
    ),
  );
  const acheminementTotal = turpeFixedTotal + turpeVariableTotal;

  // CTA base is the rounded TURPE fixed component (validated: 0.15 × 1 186 = 178 €).
  const ctaTotal = roundEur(params.ctaRate * turpeFixedTotal);

  const totalHt =
    energyTotal +
    subscriptionTotal +
    ceeTotal +
    capacityTotal +
    acheminementTotal +
    acciseTotal +
    ctaTotal;
  const tvaTotal = roundEur(params.tvaRate * totalHt);
  const totalTtc = totalHt + tvaTotal;

  return {
    currency: "EUR",
    daysPerYear: DAYS_PER_YEAR,
    energy: { lines: energyLines, totalEur: energyTotal },
    subscription: { monthlyEur: input.subscriptionEurMonth, totalEur: subscriptionTotal },
    cee: { rateEurMwh: params.ceeEurMwh, volumeMwh: totalVolumeMwh, totalEur: ceeTotal },
    capacity: {
      rateEurMwh: params.capacityEurMwh,
      volumeMwh: totalVolumeMwh,
      totalEur: capacityTotal,
    },
    acheminement: {
      fixed: {
        gestionEur,
        comptageEur,
        soutirageFixeEur,
        totalEur: turpeFixedTotal,
      },
      variable: { lines: turpeVariableLines, totalEur: turpeVariableTotal },
      totalEur: acheminementTotal,
    },
    accise: { rateEurMwh: params.acciseEurMwh, volumeMwh: totalVolumeMwh, totalEur: acciseTotal },
    cta: { rate: params.ctaRate, baseEur: turpeFixedTotal, totalEur: ctaTotal },
    totalHtEur: totalHt,
    tva: { rate: params.tvaRate, totalEur: tvaTotal },
    totalTtcEur: totalTtc,
    termYears: input.termYears,
    termTotalTtcEur: totalTtc * input.termYears,
    warnings,
  };
}

/**
 * Validated seasonal split from the Josh reference proposal
 * (specs/symphonics-pricing-model.md §2): winter 35.01 MWh (HPH 29.00 /
 * HCH 6.01), été 27.37 MWh (HPE 23.98 / HCE 3.39), total 62.38 MWh.
 */
const WINTER_TOTAL_MWH = 35.01;
const ETE_TOTAL_MWH = 27.37;
const HPH_SHARE_OF_WINTER = 29.0 / WINTER_TOTAL_MWH;
const HPE_SHARE_OF_ETE = 23.98 / ETE_TOTAL_MWH;

export interface DerivedCadranVolume {
  cadran: SeasonalCadran;
  annualVolumeMwh: number;
}

/**
 * Derive annual per-cadran volumes from an extraction. Observed volumes are
 * annualized with `12 / monthsCovered`; when only one season's cadrans are
 * present (été-only bills are the common case), the missing season is
 * reconstructed with the validated Symphonics seasonal split above.
 */
export function deriveAnnualCadranVolumes(
  observed: { cadran: Cadran; volumeMwh: number }[],
  monthsCovered = 12,
): DerivedCadranVolume[] {
  if (monthsCovered <= 0) throw new Error("MONTHS_COVERED_INVALID");
  const scale = 12 / monthsCovered;
  const annual = new Map<SeasonalCadran, number>();
  for (const line of observed) {
    const cadran = line.cadran as SeasonalCadran;
    if (!["HPH", "HCH", "HPE", "HCE"].includes(cadran)) continue;
    annual.set(cadran, (annual.get(cadran) ?? 0) + line.volumeMwh * scale);
  }
  const winter = (annual.get("HPH") ?? 0) + (annual.get("HCH") ?? 0);
  const ete = (annual.get("HPE") ?? 0) + (annual.get("HCE") ?? 0);
  if (winter === 0 && ete > 0) {
    const derivedWinter = (ete / ETE_TOTAL_MWH) * WINTER_TOTAL_MWH;
    annual.set("HPH", derivedWinter * HPH_SHARE_OF_WINTER);
    annual.set("HCH", derivedWinter * (1 - HPH_SHARE_OF_WINTER));
  } else if (ete === 0 && winter > 0) {
    const derivedEte = (winter / WINTER_TOTAL_MWH) * ETE_TOTAL_MWH;
    annual.set("HPE", derivedEte * HPE_SHARE_OF_ETE);
    annual.set("HCE", derivedEte * (1 - HPE_SHARE_OF_ETE));
  }
  return (["HPH", "HCH", "HPE", "HCE"] as SeasonalCadran[])
    .map((cadran) => ({ cadran, annualVolumeMwh: annual.get(cadran) ?? 0 }))
    .filter((line) => line.annualVolumeMwh > 0);
}
