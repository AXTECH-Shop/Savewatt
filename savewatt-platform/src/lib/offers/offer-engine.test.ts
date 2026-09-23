import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compare, proposedPrice } from "../compare.ts";
import type { CurrentContract, Proposal } from "../types";
import { hashOfferSnapshot, type OfferVersionSnapshotInput } from "./offer-snapshot.ts";
import { renderOfferHtml, escapeHtml } from "./offer-pdf.ts";
import type { OfferVersionRecord } from "./offer-types";

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
