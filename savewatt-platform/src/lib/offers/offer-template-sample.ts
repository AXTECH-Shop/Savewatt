import { compare, proposedPrice } from "../compare.ts";
import type { CurrentContract, Proposal } from "../types";
import { computeBudgetPrevisionnel, type PricingParameterValues } from "./estimate.ts";
import type { OfferPdfMeta } from "./offer-pdf";
import type { OfferVersionRecord } from "./offer-types";

/**
 * Illustrative offer used to preview the customer document templates in
 * Settings → Documents. Values are fictitious and labelled as such; no real
 * client or dossier data is used.
 */
const sampleCurrent: CurrentContract = {
  supplier: "Fournisseur actuel",
  offerName: "Offre actuelle",
  endDate: "2026-12-31",
  subscriptionEurMonth: 42,
  subscribedPowerKva: 36,
  lines: [
    { cadran: "HPH", unitPriceEurMwh: 140, volumeMwh: 40 },
    { cadran: "HCH", unitPriceEurMwh: 110, volumeMwh: 22 },
  ],
};

const sampleProposal: Proposal = {
  supplier: "Symphonics",
  ceeEurMwh: 9.66,
  capacityEurMwh: 5.71,
  subscriptionEurMonth: 30,
  marginEurMwh: 10,
  validUntil: "2026-12-31",
  termYears: 3,
  lines: [
    { cadran: "HPH", electronEurMwh: 96, annualVolumeMwh: 40 },
    { cadran: "HCH", electronEurMwh: 82, annualVolumeMwh: 22 },
  ],
};

const sampleParams: PricingParameterValues = {
  ceeEurMwh: 9.66,
  capacityEurMwh: 5.71,
  acciseEurMwh: 26.35,
  ctaRate: 0.15,
  tvaRate: 0.2,
  turpeFixed: { gestionCentsPerDay: 60.97, comptageCentsPerDay: 79.97, soutirageFixeCentsPerKwPerDay: 4.97 },
  turpeVariable: { HPH: 7.12, HCH: 4.34, HPE: 2.19, HCE: 1.57 },
};

export function buildSampleOfferVersion(): OfferVersionRecord {
  const clientPriceLines = sampleProposal.lines.map((line) => ({
    cadran: line.cadran,
    priceEurMwh: proposedPrice(sampleProposal, line.electronEurMwh),
  }));
  return {
    id: "sample",
    organizationId: "sample",
    dossierId: "sample",
    versionNo: 1,
    status: "APPROVED",
    currentContract: sampleCurrent,
    supplierOffer: sampleProposal,
    marginEurMwh: sampleProposal.marginEurMwh,
    marginOverrideReason: null,
    comparison: compare(sampleCurrent, sampleProposal),
    clientPriceLines,
    budget: computeBudgetPrevisionnel({
      lines: sampleProposal.lines.map((line) => ({
        cadran: line.cadran,
        annualVolumeMwh: line.annualVolumeMwh,
        finalPriceEurMwh: proposedPrice(sampleProposal, line.electronEurMwh),
      })),
      subscriptionEurMonth: sampleProposal.subscriptionEurMonth,
      params: sampleParams,
      powerKw: 36,
      termYears: sampleProposal.termYears,
    }),
    sha256: "0".repeat(64),
    pdfR2Key: null,
    pdfSha256: null,
    pdfMarketingR2Key: null,
    pdfMarketingSha256: null,
    createdAt: 0,
  } as OfferVersionRecord;
}

export function sampleOfferMeta(locale: string): OfferPdfMeta {
  return {
    clientName: locale === "en" ? "Sample customer" : "Client exemple",
    contactName: locale === "en" ? "Sample contact" : "Contact exemple",
    contactEmail: "contact@exemple.fr",
    pdl: "00000000000000",
  };
}
