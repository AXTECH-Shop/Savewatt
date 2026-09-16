import type { CurrentContract, Proposal, Cadran } from "./types";

export interface CadranComparison {
  cadran: Cadran;
  currentEurMwh: number | null;
  proposedEurMwh: number; // all-in comparable price (electron + CEE + capacity + margin)
  deltaEurMwh: number | null;
  annualVolumeMwh: number;
  gainPerYear: number | null; // null when not comparable (no current price)
}

export interface ComparisonResult {
  rows: CadranComparison[];
  annualEnergySaving: number;
  subscriptionSaving: number;
  annualSaving: number;
  termSaving: number;
  termYears: number;
  alerts: {
    winterMissing: boolean;
    hcOverHp: boolean;
    offerExpiring: boolean;
  };
}

const WINTER: Cadran[] = ["HPH", "HCH"];

/** Comparable all-in price for a proposed cadran (hidden margin included). */
export function proposedPrice(p: Proposal, electronEurMwh: number): number {
  return electronEurMwh + p.ceeEurMwh + p.capacityEurMwh + p.marginEurMwh;
}

export function compare(current: CurrentContract, proposal: Proposal): ComparisonResult {
  const currentByCadran = new Map(current.lines.map((l) => [l.cadran, l]));

  const rows: CadranComparison[] = proposal.lines.map((line) => {
    const proposed = proposedPrice(proposal, line.electronEurMwh);
    const cur = currentByCadran.get(line.cadran);
    const currentEurMwh = cur ? cur.unitPriceEurMwh : null;
    const deltaEurMwh = currentEurMwh === null ? null : currentEurMwh - proposed;
    const gainPerYear = deltaEurMwh === null ? null : deltaEurMwh * line.annualVolumeMwh;
    return {
      cadran: line.cadran,
      currentEurMwh,
      proposedEurMwh: proposed,
      deltaEurMwh,
      annualVolumeMwh: line.annualVolumeMwh,
      gainPerYear,
    };
  });

  const annualEnergySaving = rows.reduce((sum, r) => sum + (r.gainPerYear ?? 0), 0);
  const subscriptionSaving =
    (current.subscriptionEurMonth - proposal.subscriptionEurMonth) * 12;
  const annualSaving = annualEnergySaving + subscriptionSaving;
  const termSaving = annualSaving * proposal.termYears;

  // Alerts (mirrors brief §7.3).
  const winterMissing = proposal.lines.some(
    (l) => WINTER.includes(l.cadran) && !currentByCadran.has(l.cadran),
  );
  const peak = rows.find((r) => r.cadran === "HPE") ?? rows.find((r) => r.cadran === "HP");
  const offpeak = rows.find((r) => r.cadran === "HCE") ?? rows.find((r) => r.cadran === "HC");
  const hcOverHp = !!peak && !!offpeak && offpeak.proposedEurMwh > peak.proposedEurMwh;
  const offerExpiring = proposal.validUntil
    ? new Date(proposal.validUntil).getTime() - Date.now() < 48 * 3600 * 1000
    : false;

  return {
    rows,
    annualEnergySaving,
    subscriptionSaving,
    annualSaving,
    termSaving,
    termYears: proposal.termYears,
    alerts: { winterMissing, hcOverHp, offerExpiring },
  };
}
