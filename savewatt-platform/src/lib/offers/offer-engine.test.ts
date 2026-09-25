import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compare, proposedPrice } from "../compare.ts";
import type { AppRole } from "../access-control";
import type { CurrentContract, Proposal } from "../types";
import {
  computeBudgetPrevisionnel,
  deriveAnnualCadranVolumes,
  type PricingParameterValues,
} from "./estimate.ts";
import { hashOfferSnapshot, type OfferVersionSnapshotInput } from "./offer-snapshot.ts";
import { renderOfferHtml, escapeHtml } from "./offer-pdf.ts";
import { renderOfferBudgetHtml } from "./offer-pdf-budget.ts";
import { renderOfferMarketingHtml } from "./offer-pdf-marketing.ts";
import {
  serializeMarginGridForActor,
  serializeOfferVersionForActor,
  serializeSupplierOfferForActor,
} from "./offer-visibility.ts";
import type { MarginGridRecord, OfferVersionRecord, SupplierOfferRecord } from "./offer-types";

const current: CurrentContract = {
  supplier: "EDF",
  offerName: "offre actuelle",
  endDate: "2026-12-31",
  subscriptionEurMonth: 42,
  subscribedPowerKva: 36,
  lines: [
    { cadran: "HPH", unitPriceEurMwh: 140, volumeMwh: 40 },
    { cadran: "HCH", unitPriceEurMwh: 110, volumeMwh: 30 },
  ],
};

const proposal: Proposal = {
  supplier: "Symphonics",
  ceeEurMwh: 3,
  capacityEurMwh: 2,
  subscriptionEurMonth: 30,
  marginEurMwh: 10,
  validUntil: "2026-12-31",
  termYears: 3,
  lines: [
    { cadran: "HPH", electronEurMwh: 100, annualVolumeMwh: 40 },
    { cadran: "HCH", electronEurMwh: 90, annualVolumeMwh: 30 },
  ],
};

describe("comparator with margin", () => {
  it("includes margin in the proposed client price", () => {
    assert.equal(proposedPrice(proposal, 100), 115);
    const result = compare(current, proposal);
    assert.equal(result.rows[0].proposedEurMwh, 115);
    assert.equal(result.rows[0].deltaEurMwh, 25);
    assert.equal(result.rows[0].gainPerYear, 1000);
  });

  it("computes annual and term savings", () => {
    const result = compare(current, proposal);
    assert.equal(result.annualEnergySaving, 25 * 40 + 5 * 30);
    assert.equal(result.subscriptionSaving, (42 - 30) * 12);
    assert.equal(result.annualSaving, result.annualEnergySaving + result.subscriptionSaving);
    assert.equal(result.termSaving, result.annualSaving * 3);
  });
});

describe("offer version snapshot hashing", () => {
  const snapshot: Omit<OfferVersionSnapshotInput, "dossierId" | "versionNo"> = {
    currentContract: current,
    supplierOffer: proposal,
    marginEurMwh: 10,
    marginOverrideReason: null,
    comparison: compare(current, proposal),
    clientPriceLines: [
      { cadran: "HPH", priceEurMwh: 115 },
      { cadran: "HCH", priceEurMwh: 105 },
    ],
  };

  it("produces a stable hash for identical snapshots", () => {
    const a = hashOfferSnapshot({ ...snapshot, dossierId: "d1", versionNo: 1 });
    const b = hashOfferSnapshot({ ...snapshot, dossierId: "d1", versionNo: 1 });
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  it("changes when any input changes", () => {
    const base = hashOfferSnapshot({ ...snapshot, dossierId: "d1", versionNo: 1 });
    assert.notEqual(hashOfferSnapshot({ ...snapshot, dossierId: "d2", versionNo: 1 }), base);
    assert.notEqual(
      hashOfferSnapshot({ ...snapshot, marginEurMwh: 12, dossierId: "d1", versionNo: 1 }),
      base,
    );
    assert.notEqual(hashOfferSnapshot({ ...snapshot, dossierId: "d1", versionNo: 2 }), base);
  });
});

describe("offer PDF secrecy", () => {
  const version = {
    id: "ov1",
    organizationId: "org1",
    dossierId: "d1",
    versionNo: 1,
    status: "APPROVED",
    currentContract: current,
    supplierOffer: proposal,
    marginEurMwh: 10,
    marginOverrideReason: null,
    comparison: compare(current, proposal),
    clientPriceLines: [
      { cadran: "HPH", priceEurMwh: 115 },
      { cadran: "HCH", priceEurMwh: 105 },
    ],
    sha256: "a".repeat(64),
    pdfR2Key: null,
    pdfSha256: null,
    createdAt: 0,
  } as OfferVersionRecord;

  it("renders client-safe HTML without buy price or margin", () => {
    const html = renderOfferHtml(version, {
      clientName: "Boulangerie Dupont",
      contactName: "Marie",
      contactEmail: "marie@example.fr",
      pdl: "12345678901234",
    }, "fr");
    assert.match(html, /Boulangerie Dupont/);
    assert.match(html, /115/);
    assert.doesNotMatch(html, /100,00/); // electron buy price never rendered
    assert.doesNotMatch(html, /100\s*€\/MWh/);
    assert.doesNotMatch(html, /90,00/); // HCH electron buy price
    assert.doesNotMatch(html, /marge/i);
    assert.doesNotMatch(html, /Marge commerciale/);
  });

  it("escapes HTML in client-supplied values", () => {
    assert.equal(escapeHtml(`<script>"'&`), "&lt;script&gt;&quot;&#39;&amp;");
  });
});

// Validated Symphonics constants — specs/symphonics-pricing-model.md §2
// (sources: tmp/pdf-analysis/pdf2-josh-bill.txt, pdf5-edf-facture.txt).
const symphonicsParams: PricingParameterValues = {
  ceeEurMwh: 9.66,
  capacityEurMwh: 5.71,
  acciseEurMwh: 26.35,
  ctaRate: 0.15,
  tvaRate: 0.2,
  turpeFixed: {
    gestionCentsPerDay: 60.97,
    comptageCentsPerDay: 79.97,
    soutirageFixeCentsPerKwPerDay: 4.97,
  },
  turpeVariable: { HPH: 7.12, HCH: 4.34, HPE: 2.19, HCE: 1.57 },
};

function approx(actual: number, expected: number, tolerance = 1): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

describe("budget prévisionnel (Symphonics reconciliation)", () => {
  // Josh / AX TECH proposal: 62.38 MWh, PS 37 kW, margin 0 (validation replay).
  const budget = computeBudgetPrevisionnel({
    lines: [
      { cadran: "HPH", annualVolumeMwh: 29.0, finalPriceEurMwh: 140.48 },
      { cadran: "HCH", annualVolumeMwh: 6.01, finalPriceEurMwh: 107.12 },
      { cadran: "HPE", annualVolumeMwh: 23.98, finalPriceEurMwh: 77.4 },
      { cadran: "HCE", annualVolumeMwh: 3.39, finalPriceEurMwh: 96.08 },
    ],
    subscriptionEurMonth: 20,
    params: symphonicsParams,
    powerKw: 37,
    termYears: 2,
  });

  it("reproduces every Symphonics budget line", () => {
    approx(budget.energy.totalEur, 6899);
    approx(budget.subscription.totalEur, 240);
    approx(budget.cee.totalEur, 603);
    approx(budget.capacity.totalEur, 356);
    approx(budget.acheminement.fixed.totalEur, 1186);
    approx(budget.acheminement.variable.totalEur, 2904);
    approx(budget.acheminement.totalEur, 4090);
    approx(budget.accise.totalEur, 1644);
    approx(budget.cta.totalEur, 178);
    approx(budget.totalHtEur, 14010);
    approx(budget.tva.totalEur, 2802);
    approx(budget.totalTtcEur, 16812);
  });

  it("computes term totals and warns only on unmapped cadrans", () => {
    assert.equal(budget.termTotalTtcEur, budget.totalTtcEur * 2);
    assert.deepEqual(budget.warnings, []);
    const withBase = computeBudgetPrevisionnel({
      lines: [{ cadran: "BASE", annualVolumeMwh: 10, finalPriceEurMwh: 100 }],
      subscriptionEurMonth: 20,
      params: symphonicsParams,
      powerKw: 37,
      termYears: 3,
    });
    assert.deepEqual(withBase.warnings, ["TURPE_VARIABLE_RATE_MISSING:BASE"]);
  });
});

describe("annual volume forecast helper", () => {
  it("reconstructs winter from été-only data with the validated seasonal split", () => {
    const volumes = deriveAnnualCadranVolumes([
      { cadran: "HPE", volumeMwh: 23.98 },
      { cadran: "HCE", volumeMwh: 3.39 },
    ]);
    const byCadran = new Map(volumes.map((v) => [v.cadran, v.annualVolumeMwh]));
    approx(byCadran.get("HPH") ?? 0, 29.0, 0.01);
    approx(byCadran.get("HCH") ?? 0, 6.01, 0.01);
    approx(byCadran.get("HPE") ?? 0, 23.98, 0.01);
    approx(byCadran.get("HCE") ?? 0, 3.39, 0.01);
  });

  it("annualizes partial-year observations", () => {
    const volumes = deriveAnnualCadranVolumes(
      [
        { cadran: "HPH", volumeMwh: 10 },
        { cadran: "HPE", volumeMwh: 5 },
      ],
      6,
    );
    const byCadran = new Map(volumes.map((v) => [v.cadran, v.annualVolumeMwh]));
    approx(byCadran.get("HPH") ?? 0, 20, 0.001);
    approx(byCadran.get("HPE") ?? 0, 10, 0.001);
  });
});

describe("régie visibility serializer", () => {
  const admin = { role: "SUPER_ADMIN" as AppRole };
  const regie = { role: "APPORTEUR" as AppRole };

  const supplierOffer: SupplierOfferRecord = {
    id: "so1",
    organizationId: "org1",
    dossierId: "d1",
    validUntil: "2026-09-16",
    termYears: 3,
    ceeEurMwh: 9.66,
    capacityEurMwh: 5.71,
    subscriptionEurMonth: 20,
    sourceDocumentId: null,
    createdAt: 0,
    updatedAt: 0,
    lines: [{ cadran: "HPH", electronEurMwh: 140.48, annualVolumeMwh: 29 }],
  };

  it("strips buy price, CEE and capacity from supplier offers for régie roles", () => {
    const view = serializeSupplierOfferForActor(regie, supplierOffer);
    assert.ok(view);
    assert.equal("ceeEurMwh" in view, false);
    assert.equal("capacityEurMwh" in view, false);
    assert.equal("electronEurMwh" in view.lines[0], false);
    assert.equal(view.lines[0].annualVolumeMwh, 29);
    assert.equal(view.subscriptionEurMonth, 20);
    assert.equal(JSON.stringify(view).includes("140.48"), false);
  });

  it("returns supplier offers untouched for operator roles", () => {
    assert.equal(serializeSupplierOfferForActor(admin, supplierOffer), supplierOffer);
    assert.equal(serializeSupplierOfferForActor(regie, null), null);
  });

  const version = {
    id: "ov1",
    organizationId: "org1",
    dossierId: "d1",
    versionNo: 1,
    status: "APPROVED",
    currentContract: current,
    supplierOffer: proposal,
    marginEurMwh: 10,
    marginOverrideReason: null,
    comparison: compare(current, proposal),
    clientPriceLines: [
      { cadran: "HPH", priceEurMwh: 115 },
      { cadran: "HCH", priceEurMwh: 105 },
    ],
    budget: null,
    sha256: "a".repeat(64),
    pdfR2Key: null,
    pdfSha256: null,
    pdfMarketingR2Key: null,
    pdfMarketingSha256: null,
    createdAt: 0,
  } as OfferVersionRecord;

  it("strips margin and buy-side components from offer versions for régie roles", () => {
    const view = serializeOfferVersionForActor(regie, version);
    assert.equal("marginEurMwh" in view, false);
    assert.equal("marginOverrideReason" in view, false);
    assert.equal("marginEurMwh" in view.supplierOffer, false);
    assert.equal("ceeEurMwh" in view.supplierOffer, false);
    assert.equal("capacityEurMwh" in view.supplierOffer, false);
    assert.equal("electronEurMwh" in view.supplierOffer.lines[0], false);
    // Final client prices stay visible — régie shares those with the customer.
    assert.equal(view.clientPriceLines[0].priceEurMwh, 115);
  });

  it("returns offer versions untouched for operator roles", () => {
    assert.equal(serializeOfferVersionForActor(admin, version), version);
  });

  const grid: MarginGridRecord = {
    id: "g1",
    organizationId: "org1",
    version: 1,
    status: "ACTIVE",
    roleScope: "ADMIN",
    minMarginEurMwh: 4,
    defaultMarginEurMwh: 10,
    maxMarginEurMwh: 18,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    createdAt: 0,
  };

  it("strips margin-grid bounds for régie roles", () => {
    const view = serializeMarginGridForActor(regie, grid);
    assert.ok(view);
    assert.equal("minMarginEurMwh" in view, false);
    assert.equal("defaultMarginEurMwh" in view, false);
    assert.equal("maxMarginEurMwh" in view, false);
    assert.equal(serializeMarginGridForActor(admin, grid), grid);
  });
});

describe("dual offer PDFs", () => {
  // Distinct buy-side values so any leak is detectable in rendered HTML:
  // électron 97.53 / 84.21, margin 12.34 → final client prices 109.87 / 96.55.
  const dualProposal: Proposal = {
    ...proposal,
    ceeEurMwh: 9.66,
    capacityEurMwh: 5.71,
    marginEurMwh: 12.34,
    termYears: 3,
    lines: [
      { cadran: "HPH", electronEurMwh: 97.53, annualVolumeMwh: 29 },
      { cadran: "HCH", electronEurMwh: 84.21, annualVolumeMwh: 6.01 },
    ],
  };
  const dualComparison = compare(current, dualProposal);
  const budget = computeBudgetPrevisionnel({
    lines: dualProposal.lines.map((line) => ({
      cadran: line.cadran,
      annualVolumeMwh: line.annualVolumeMwh,
      finalPriceEurMwh: line.electronEurMwh + dualProposal.marginEurMwh,
    })),
    subscriptionEurMonth: dualProposal.subscriptionEurMonth,
    params: symphonicsParams,
    powerKw: 37,
    termYears: dualProposal.termYears,
  });
  const dualVersion = {
    id: "ov2",
    organizationId: "org1",
    dossierId: "d1",
    versionNo: 2,
    status: "APPROVED",
    currentContract: current,
    supplierOffer: dualProposal,
    marginEurMwh: 12.34,
    marginOverrideReason: null,
    comparison: dualComparison,
    clientPriceLines: dualProposal.lines.map((line) => ({
      cadran: line.cadran,
      priceEurMwh: proposedPrice(dualProposal, line.electronEurMwh),
    })),
    budget,
    sha256: "b".repeat(64),
    pdfR2Key: null,
    pdfSha256: null,
    pdfMarketingR2Key: null,
    pdfMarketingSha256: null,
    createdAt: 0,
  } as OfferVersionRecord;
  const meta = {
    clientName: "AX TECH",
    contactName: "Josh",
    contactEmail: "josh@example.fr",
    pdl: "50066947359734",
  };

  it("budget prévisionnel renders final prices and budget lines, never buy-side values", () => {
    const html = renderOfferBudgetHtml(dualVersion, meta, "fr");
    assert.match(html, /Budget prévisionnel/);
    assert.match(html, /Consommation annuelle prévisionnelle/);
    assert.match(html, /109,87/); // final margin-inclusive HPH price
    assert.match(html, /Total TTC annuel/);
    assert.match(html, /Acheminement \(TURPE\)/);
    assert.doesNotMatch(html, /97,53|84,21/); // électron buy prices
    assert.doesNotMatch(html, /12,34/); // margin
    assert.doesNotMatch(html, /9,66|5,71/); // CEE/capa per-MWh component rates (totals only)
    assert.doesNotMatch(html, /marge/i);
  });

  it("marketing one-pager renders savings, benefits and TTC summary, never buy-side values", () => {
    const html = renderOfferMarketingHtml(dualVersion, meta, "fr");
    assert.match(html, /Votre économie estimée/);
    assert.match(html, /Prix fixe 36 mois/);
    assert.match(html, /100 % renouvelable/);
    assert.match(html, /Accompagnement SaveWatt/);
    assert.match(html, /Zéro démarche/);
    assert.match(html, /TTC \/ an/);
    assert.match(html, /contact@savewatt\.fr/);
    assert.doesNotMatch(html, /97,53|84,21|12,34|9,66|5,71/);
    assert.doesNotMatch(html, /marge/i);
  });

  it("budget template refuses versions without a budget snapshot", () => {
    assert.throws(
      () => renderOfferBudgetHtml({ ...dualVersion, budget: null }, meta, "fr"),
      /OFFER_BUDGET_MISSING/,
    );
  });
});
