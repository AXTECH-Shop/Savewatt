import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConsumptionLine, ExtractionResult } from "../extraction/schema";
import { autoSendIssues, monthsCovered, planIntakeOffer, type ReferenceTerms } from "./intake-plan.ts";

function line(cadran: ConsumptionLine["cadran"], volumeKwh: number, price: number | null, start: string | null, end: string | null): ConsumptionLine {
  return {
    cadran,
    volumeKwh,
    unitPricePrinted: price,
    unitPricePrintedUnit: price === null ? null : "€/MWh",
    unitPriceEurMwh: price,
    periodStart: start,
    periodEnd: end,
    indexStart: null,
    indexEnd: null,
  };
}

function bill(consumption: ConsumptionLine[], overrides: Partial<ExtractionResult["bill"]> = {}): ExtractionResult {
  return {
    bill: {
      supplier: "EDF",
      offerName: "Tarif Jaune",
      optionTarifaire: "4_CADRANS",
      invoiceNumber: null,
      invoiceDate: null,
      nextInvoiceDate: null,
      billingAccount: null,
      commercialAccount: null,
      siren: "123456789",
      clientName: "Boulangerie Test",
      siteAddress: "1 rue de Paris",
      pdlOrPrm: "50066947359734",
      meteringId: null,
      meterType: null,
      segment: "C4",
      routingTariff: null,
      subscribedPowerKva: 36,
      annualReferenceKwh: null,
      subscriptionPrinted: 30,
      subscriptionPrintedUnit: "€/mois",
      subscriptionEurPerMonth: 30,
      contractStartDate: null,
      contractEndDate: null,
      tacitRenewalSuspected: null,
      consumption,
      services: [],
      totals: { totalHtEur: null, tvaEur: null, totalTtcEur: null },
      ...overrides,
    },
    fieldConfidence: [],
    overallConfidence: 0.92,
    warnings: [],
  };
}

const reference: ReferenceTerms = {
  termYears: 3,
  subscriptionEurMonth: 20,
  validUntil: "2026-12-31",
  prices: { HPH: 140, HCH: 107, HPE: 77, HCE: 96 },
  autoSend: true,
  minConfidence: 0.8,
};
const passThrough = { ceeEurMwh: 9.66, capacityEurMwh: 5.71 };

describe("intake plan", () => {
  it("measures the billed period in months", () => {
    assert.equal(monthsCovered(bill([line("HPE", 2000, 180, "2026-06-01", "2026-06-30")])), 0.99);
    assert.equal(monthsCovered(bill([line("HPE", 2000, 180, null, null)])), null);
  });

  it("annualizes a one-season bill and applies reference prices", () => {
    const result = bill([
      line("HPE", 2000, 180, "2026-06-01", "2026-06-30"),
      line("HCE", 300, 140, "2026-06-01", "2026-06-30"),
    ]);
    const { plan, issues } = planIntakeOffer({ result, reference, passThrough });
    assert.deepEqual(issues, []);
    assert.equal(plan.volumeBasis, "PERIOD");
    assert.deepEqual(plan.lines.map((entry) => entry.cadran), ["HPH", "HCH", "HPE", "HCE"]);
    assert.equal(plan.lines.find((entry) => entry.cadran === "HPE")?.electronEurMwh, 77);
    assert.ok((plan.lines.find((entry) => entry.cadran === "HPH")?.annualVolumeMwh ?? 0) > 0);
    const ete = plan.lines
      .filter((entry) => entry.cadran === "HPE" || entry.cadran === "HCE")
      .reduce((sum, entry) => sum + entry.annualVolumeMwh, 0);
    assert.ok(Math.abs(ete - (2.3 * 7) / 0.99) < 0.01, "été annualized over its 7-month season");
    assert.equal(plan.subscriptionEurMonth, 20);
    assert.equal(plan.ceeEurMwh, 9.66);
  });

  it("prefers the annual reference consumption over the billed period", () => {
    const result = bill([line("HPE", 2000, 180, "2026-06-01", "2026-06-30")], { annualReferenceKwh: 62_380 });
    const { plan } = planIntakeOffer({ result, reference, passThrough });
    assert.equal(plan.volumeBasis, "ANNUAL_REFERENCE");
    const total = plan.lines.reduce((sum, entry) => sum + entry.annualVolumeMwh, 0);
    assert.ok(Math.abs(total - 62.38) < 0.01);
  });

  it("flags HP/HC bills and missing references for review", () => {
    const result = bill([line("HP", 1000, 200, "2026-06-01", "2026-06-30"), line("HC", 500, 150, "2026-06-01", "2026-06-30")]);
    const { plan, issues } = planIntakeOffer({ result, reference: null, passThrough });
    assert.deepEqual(issues, ["UNSUPPORTED_TARIFF", "REFERENCE_TERMS_MISSING"]);
    assert.deepEqual(plan.lines.map((entry) => entry.cadran), ["HP", "HC"]);
    assert.equal(plan.lines[0].electronEurMwh, null);
    assert.ok(Math.abs(plan.lines[0].annualVolumeMwh - 12.12) < 0.01);
  });

  it("only auto-sends when every guard passes", () => {
    const result = bill([line("HPE", 2000, 180, "2026-06-01", "2026-06-30")]);
    const { issues } = planIntakeOffer({ result, reference, passThrough });
    assert.deepEqual(
      autoSendIssues({ result, reference, planIssues: issues, contactEmail: "client@example.fr", today: "2026-09-25" }),
      [],
    );
    const risky = { ...result, overallConfidence: 0.5, bill: { ...result.bill, pdlOrPrm: null, subscribedPowerKva: null } };
    assert.deepEqual(
      autoSendIssues({
        result: risky,
        reference: { ...reference, autoSend: false, validUntil: "2026-09-26" },
        planIssues: issues,
        contactEmail: "nope",
        today: "2026-09-25",
      }),
      ["LOW_CONFIDENCE", "PDL_MISSING", "POWER_MISSING", "REFERENCE_EXPIRED", "AUTO_SEND_DISABLED", "CONTACT_EMAIL_MISSING"],
    );
  });
});
