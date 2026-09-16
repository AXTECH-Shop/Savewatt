export interface CascadeRule {
  beneficiaryId: string;
  label: string;
  percentageOfMasterPool?: number;
  eurPerMwh?: number;
  signingPrimeEur?: number;
  capEur?: number;
  clawbackEur?: number;
}

export interface CommissionLine {
  beneficiaryId: string;
  label: string;
  amountEur: number;
  source: "LOCKED_SPLIT" | "CASCADE" | "REMAINDER";
}

export interface CommissionResult {
  totalMarginEur: number;
  symphonicsEur: number;
  networkPoolEur: number;
  axTechEur: number;
  masterPoolEur: number;
  lines: CommissionLine[];
}

function cents(value: number): number {
  return Math.round(value * 100);
}

function euros(valueInCents: number): number {
  return valueInCents / 100;
}

export function calculateCommissionCascade(input: {
  marginEurMwh: number;
  volumeMwh: number;
  rules: CascadeRule[];
}): CommissionResult {
  if (input.marginEurMwh < 0 || input.volumeMwh < 0) {
    throw new Error("Commission inputs must be non-negative.");
  }

  const totalMargin = cents(input.marginEurMwh * input.volumeMwh);
  const networkPool = Math.round(totalMargin * 0.66);
  const symphonics = totalMargin - networkPool;
  const axTech = Math.round(networkPool * 0.5);
  const masterPool = networkPool - axTech;
  let available = masterPool;

  const lines: CommissionLine[] = [
    { beneficiaryId: "symphonics", label: "Symphonics", amountEur: euros(symphonics), source: "LOCKED_SPLIT" },
    { beneficiaryId: "ax-tech", label: "AX TECH", amountEur: euros(axTech), source: "LOCKED_SPLIT" },
  ];

  for (const rule of input.rules) {
    const percentage = rule.percentageOfMasterPool ?? 0;
    if (percentage < 0 || percentage > 100) throw new Error("Cascade percentages must be between 0 and 100.");
    const variable = Math.round(masterPool * (percentage / 100));
    const volumeBased = cents((rule.eurPerMwh ?? 0) * input.volumeMwh);
    const prime = cents(rule.signingPrimeEur ?? 0);
    const clawback = cents(rule.clawbackEur ?? 0);
    const cap = rule.capEur === undefined ? Number.POSITIVE_INFINITY : cents(rule.capEur);
    const due = Math.max(0, Math.min(variable + volumeBased + prime - clawback, cap));
    if (due > available) throw new Error("Cascade exceeds the master commission pool.");
    available -= due;
    lines.push({ beneficiaryId: rule.beneficiaryId, label: rule.label, amountEur: euros(due), source: "CASCADE" });
  }

  lines.push({ beneficiaryId: "master", label: "Régie maître", amountEur: euros(available), source: "REMAINDER" });
  return { totalMarginEur: euros(totalMargin), symphonicsEur: euros(symphonics), networkPoolEur: euros(networkPool), axTechEur: euros(axTech), masterPoolEur: euros(masterPool), lines };
}
