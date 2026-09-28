import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compare } from "../compare.ts";
import { normalizeBill } from "../extraction/normalize.ts";
import type { ExtractedBill } from "../extraction/schema";
import type { Proposal, ProposedLine } from "../types";
import type { PricingParameterValues } from "./estimate.ts";
import {
  budgetForOffer,
  currentContractFromBill,
  isSmallSite,
  profileCoverage,
  ratesForSite,
  splitFlatVolumes,
} from "./pricing-mechanism.ts";

// Rates as configured in production; C5 excise set to the 26.35 €/MWh Symphonics uses in its quotes.
const params: PricingParameterValues = {
  ceeEurMwh: 9.66,
  capacityEurMwh: 5.71,
  acciseEurMwh: 26.35,
  ctaRate: 0.15,
  tvaRate: 0.2,
  turpeFixed: { gestionCentsPerDay: 60.97, comptageCentsPerDay: 79.97, soutirageFixeCentsPerKwPerDay: 4.97 },
  turpeVariable: { HPH: 7.12, HCH: 4.34, HPE: 2.19, HCE: 1.57 },
  smallSiteRates: {
    acciseEurMwh: 26.35,
    turpeFixed: { gestionCentsPerDay: 4.69, comptageCentsPerDay: 6.21, soutirageFixeCentsPerKwPerDay: 2.855 },
    turpeVariable: { HPH: 7.5, HCH: 4.58, HPE: 1.71, HCE: 1.2 },
  },
  consumptionProfile: { HPH: 41.1, HCH: 18, HPE: 30.1, HCE: 10.8 },
};

const gibel: ProposedLine[] = [
  { cadran: "HPH", electronEurMwh: 112.48, annualVolumeMwh: 6.68 },
  { cadran: "HCH", electronEurMwh: 81.96, annualVolumeMwh: 2.9 },
  { cadran: "HPE", electronEurMwh: 73.93, annualVolumeMwh: 3.81 },
  { cadran: "HCE", electronEurMwh: 52.68, annualVolumeMwh: 1.41 },
];
const expert: ProposedLine[] = [
  { cadran: "HPH", electronEurMwh: 112.55, annualVolumeMwh: 3.2 },
  { cadran: "HCH", electronEurMwh: 86.11, annualVolumeMwh: 1.42 },
  { cadran: "HPE", electronEurMwh: 66.07, annualVolumeMwh: 2.98 },
  { cadran: "HCE", electronEurMwh: 46.24, annualVolumeMwh: 1.05 },
];

function bill(overrides: Partial<ExtractedBill>): ExtractedBill {
  return {
    supplier: "ENGIE", offerName: null, optionTarifaire: "BASE", invoiceNumber: null, invoiceDate: null,
    nextInvoiceDate: null, billingAccount: null, commercialAccount: null, siren: null, clientName: null,
    siteAddress: null, pdlOrPrm: null, meteringId: null, meterType: null, segment: "C5", routingTariff: null,
    subscribedPowerKva: 30, annualReferenceKwh: null, subscriptionPrinted: null, subscriptionPrintedUnit: null,
    subscriptionEurPerMonth: 14.35, contractStartDate: null, contractEndDate: null, tacitRenewalSuspected: null,
    consumption: [], services: [], totals: { totalHtEur: null, tvaEur: null, totalTtcEur: null },
    ...overrides,
  };
}

describe("pricing mechanism (validated on real Symphonics C5 quotes)", () => {
  it("uses small-site network rates up to 36 kVA", () => {
    assert.equal(isSmallSite({ segment: "C5" }), true);
    assert.equal(isSmallSite({ segment: "C4", powerKva: 30 }), false);
    assert.equal(isSmallSite({ powerKva: 36 }), true);
    assert.equal(isSmallSite({ powerKva: 120 }), false);
    assert.equal(ratesForSite(params, { segment: "C4" }).turpeFixed.gestionCentsPerDay, 60.97);
    assert.equal(ratesForSite(params, { segment: "C5" }).turpeFixed.gestionCentsPerDay, 4.69);
  });

  it("reproduces the Gibel budget to the euro", () => {
    const budget = budgetForOffer({
      lines: gibel, marginEurMwh: 0, subscriptionEurMonth: 20, ceeEurMwh: 9.66, capacityEurMwh: 5.78,
      termYears: 2, params, site: { segment: "C5", powerKva: 12 },
    });
    assert.equal(budget.energy.totalEur, 1345);
    assert.equal(budget.subscription.totalEur, 240);
    assert.equal(budget.cee.totalEur, 143);
    assert.equal(budget.capacity.totalEur, 86);
    assert.equal(budget.acheminement.totalEur, 881);
    assert.equal(budget.accise.totalEur, 390);
    assert.equal(budget.cta.totalEur, 25);
    assert.equal(budget.tva.totalEur, 622);
    assert.equal(budget.totalTtcEur, 3732);
  });

  it("reproduces the Expert Eco Isol budget to the euro", () => {
    const budget = budgetForOffer({
      lines: expert, marginEurMwh: 0, subscriptionEurMonth: 20, ceeEurMwh: 9.66, capacityEurMwh: 4.96,
      termYears: 2, params, site: { segment: "C5", powerKva: 30 },
    });
    assert.equal(budget.energy.totalEur, 728);
    assert.equal(budget.acheminement.totalEur, 721);
    assert.equal(budget.accise.totalEur, 228);
    assert.equal(budget.cta.totalEur, 53);
    assert.equal(budget.totalTtcEur, 2516);
  });

  it("prices the current contract all-in: promotion off the energy, supplier per-kWh charges on top", () => {
    const current = currentContractFromBill(
      bill({
        consumption: [{ cadran: "BASE", volumeKwh: 514, unitPricePrinted: 0.08285, unitPricePrintedUnit: "€/kWh", unitPriceEurMwh: 82.85, periodStart: "2026-05-16", periodEnd: "2026-06-15", indexStart: null, indexEnd: null }],
        supplyCharges: [
          { label: "Obligations", unitPricePrinted: 0.00996, unitPricePrintedUnit: "€/kWh", unitPriceEurMwh: 9.96 },
          { label: "Garanties d'origine", unitPricePrinted: 0.00012, unitPricePrintedUnit: "€/kWh", unitPriceEurMwh: 0.12 },
        ],
        consumptionDiscountPct: 15,
      }),
    );
    assert.equal(current.lines[0].unitPriceEurMwh, 80.5);
    assert.equal(current.segment, "C5");
  });

  it("compares a flat current price against every seasonal cadran", () => {
    const proposal: Proposal = {
      supplier: "Symphonics", ceeEurMwh: 9.66, capacityEurMwh: 5.78, subscriptionEurMonth: 20,
      marginEurMwh: 0, validUntil: null, termYears: 2, lines: gibel,
    };
    const result = compare(
      { supplier: "TotalEnergies", offerName: "", endDate: null, subscriptionEurMonth: 10, subscribedPowerKva: 12, lines: [{ cadran: "BASE", unitPriceEurMwh: 97.11, volumeMwh: 0.457 }] },
      proposal,
    );
    assert.ok(result.rows.every((row) => row.currentEurMwh === 97.11));
    assert.equal(result.alerts.winterMissing, false);
    assert.equal(Math.round(result.annualSaving), -256);
  });

  it("annualizes a one-month summer Base bill by season and splits it into four cadrans", () => {
    const profile = params.consumptionProfile!;
    const coverage = profileCoverage("2026-05-16", "2026-06-15", profile)!;
    const annualMwh = 0.514 / coverage;
    assert.ok(Math.abs(annualMwh - 8.65) < 0.1, `annual ${annualMwh}`);
    const split = splitFlatVolumes([{ cadran: "BASE", annualVolumeMwh: annualMwh }], profile)!;
    assert.deepEqual(split.map((line) => line.cadran), ["HPH", "HCH", "HPE", "HCE"]);
    assert.ok(Math.abs(split.reduce((sum, line) => sum + line.annualVolumeMwh, 0) - annualMwh) < 1e-9);
    const hphc = splitFlatVolumes([{ cadran: "HP", annualVolumeMwh: 10 }, { cadran: "HC", annualVolumeMwh: 5 }], profile)!;
    assert.ok(Math.abs(hphc.find((line) => line.cadran === "HPH")!.annualVolumeMwh - (10 * 41.1) / 71.2) < 1e-9);
  });

  it("drops network lines read as energy on a Base supply", () => {
    const normalized = normalizeBill(
      bill({
        consumption: [
          { cadran: "BASE", volumeKwh: 514, unitPricePrinted: 0.08285, unitPricePrintedUnit: "€/kWh", unitPriceEurMwh: 82.85, periodStart: null, periodEnd: null, indexStart: null, indexEnd: null },
          { cadran: "HPE", volumeKwh: 373, unitPricePrinted: 0.0166, unitPricePrintedUnit: "€/kWh", unitPriceEurMwh: 16.6, periodStart: null, periodEnd: null, indexStart: null, indexEnd: null },
        ],
      }),
    );
    assert.deepEqual(normalized.consumption.map((line) => line.cadran), ["BASE"]);
  });
});
