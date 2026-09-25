import "server-only";

import { randomUUID } from "node:crypto";
import type { ComparisonResult } from "@/lib/compare";
import type { CurrentContract } from "@/lib/types";
import { DatabaseManager } from "../cloudflare/database-manager.ts";
import { DocumentStorageManager } from "../cloudflare/document-storage-manager.ts";
import type { BudgetPrevisionnel } from "../offers/estimate.ts";
import type { ClientPriceLine, OfferVersionStatus } from "../offers/offer-types.ts";
import {
  inspectPortalToken,
  type PortalTokenPayload,
} from "./portal-token.ts";

/**
 * Public portal data loader. The signed token (portal-token.ts) is the only
 * authorization — there is no logged-in actor — so every read here is scoped
 * by the token payload and every returned field is whitelisted customer-safe
 * data (same secrecy-by-construction rule as offer-visibility.ts):
 * électron buy price, margin, CEE/capacity per-MWh rates, internal notes and
 * R2 keys never leave this module.
 */

export interface PortalComparisonRow {
  cadran: string;
  currentEurMwh: number | null;
  proposedEurMwh: number;
  annualVolumeMwh: number;
  gainPerYear: number | null;
}

/** Budget prévisionnel, customer-safe: totals and final prices only. */
export interface PortalBudgetSummary {
  energyLines: {
    cadran: string;
    volumeMwh: number;
    rateEurMwh: number;
    amountEur: number;
  }[];
  energyTotalEur: number;
  subscriptionMonthlyEur: number;
  subscriptionTotalEur: number;
  ceeTotalEur: number;
  capacityTotalEur: number;
  acheminementTotalEur: number;
  acciseTotalEur: number;
  ctaTotalEur: number;
  totalHtEur: number;
  tvaRate: number;
  tvaTotalEur: number;
  totalTtcEur: number;
  termYears: number;
  termTotalTtcEur: number;
}

export interface PortalOfferView {
  offerVersionId: string;
  versionNo: number;
  clientName: string;
  contactName: string | null;
  pdl: string | null;
  currentSupplier: string;
  currentOfferName: string;
  supplierName: string;
  validUntil: string | null;
  termYears: number;
  subscriptionEurMonth: number;
  priceLines: ClientPriceLine[];
  comparisonRows: PortalComparisonRow[];
  annualSavingEur: number;
  termSavingEur: number;
  budget: PortalBudgetSummary | null;
  documents: { budget: boolean; marketing: boolean };
  sentAt: number | null;
  viewedAt: number | null;
  recipientEmail: string;
}

export type PortalOfferResolution =
  | { kind: "ready"; offer: PortalOfferView }
  | { kind: "invalid" } // malformed/tampered token — generic error, no leak
  | { kind: "token-expired" } // signed token past its exp — "lien expiré"
  | { kind: "offer-expired" } // version administratively EXPIRED
  | { kind: "revoked" } // version REVOKED
  | { kind: "unavailable" }; // unknown id or not SENT yet — no leak either way

export type PortalDocumentKind = "budget" | "marketing";

export function isPortalDocumentKind(value: string): value is PortalDocumentKind {
  return value === "budget" || value === "marketing";
}

export interface PortalOfferVersionRow {
  id: string;
  organization_id: string;
  dossier_id: string;
  version_no: number;
  status: OfferVersionStatus;
  current_contract_json: string;
  client_price_lines_json: string;
  comparison_json: string;
  budget_json: string | null;
  supplier_name: string;
  valid_until: string | null;
  term_years: number;
  subscription_eur_month: number;
  pdf_r2_key: string | null;
  pdf_marketing_r2_key: string | null;
}

interface PortalClientRow {
  legal_name: string | null;
  contact_name: string | null;
  pdl: string | null;
}

/** Maps an offer-version status to its portal rendering state. */
export function portalStateForStatus(
  status: OfferVersionStatus,
): "ready" | "offer-expired" | "revoked" | "unavailable" {
  if (status === "SENT") return "ready";
  if (status === "EXPIRED") return "offer-expired";
  if (status === "REVOKED") return "revoked";
  return "unavailable"; // DRAFT / APPROVAL_REQUIRED / APPROVED: never public
}

/** Builds the customer-safe view — pure whitelist, unit-tested for leaks. */
export function toPortalOfferView(input: {
  row: PortalOfferVersionRow;
  client: PortalClientRow | null;
  sentAt: number | null;
  viewedAt: number | null;
  recipientEmail: string;
}): PortalOfferView {
  const { row } = input;
  const currentContract = JSON.parse(row.current_contract_json) as CurrentContract;
  const comparison = JSON.parse(row.comparison_json) as ComparisonResult;
  const budget = row.budget_json ? (JSON.parse(row.budget_json) as BudgetPrevisionnel) : null;
  const priceLines = JSON.parse(row.client_price_lines_json) as ClientPriceLine[];
  return {
    offerVersionId: row.id,
    versionNo: row.version_no,
    clientName: input.client?.legal_name ?? "",
    contactName: input.client?.contact_name ?? null,
    pdl: input.client?.pdl ?? null,
    currentSupplier: currentContract.supplier,
    currentOfferName: currentContract.offerName,
    supplierName: row.supplier_name,
    validUntil: row.valid_until,
    termYears: row.term_years,
    subscriptionEurMonth: row.subscription_eur_month,
    priceLines: priceLines.map((line) => ({
      cadran: line.cadran,
      priceEurMwh: line.priceEurMwh,
    })),
    comparisonRows: comparison.rows.map((comparisonRow) => ({
      cadran: comparisonRow.cadran,
      currentEurMwh: comparisonRow.currentEurMwh,
      proposedEurMwh: comparisonRow.proposedEurMwh,
      annualVolumeMwh: comparisonRow.annualVolumeMwh,
      gainPerYear: comparisonRow.gainPerYear,
    })),
    annualSavingEur: comparison.annualSaving,
    termSavingEur: comparison.termSaving,
    budget: budget ? toPortalBudgetSummary(budget) : null,
    documents: {
      budget: row.pdf_r2_key !== null,
      marketing: row.pdf_marketing_r2_key !== null,
    },
    sentAt: input.sentAt,
    viewedAt: input.viewedAt,
    recipientEmail: input.recipientEmail,
  };
}

function toPortalBudgetSummary(budget: BudgetPrevisionnel): PortalBudgetSummary {
  return {
    energyLines: budget.energy.lines.map((line) => ({
      cadran: line.cadran,
      volumeMwh: line.volumeMwh,
      rateEurMwh: line.rateEurMwh,
      amountEur: line.amountEur,
    })),
    energyTotalEur: budget.energy.totalEur,
    subscriptionMonthlyEur: budget.subscription.monthlyEur,
    subscriptionTotalEur: budget.subscription.totalEur,
    ceeTotalEur: budget.cee.totalEur,
    capacityTotalEur: budget.capacity.totalEur,
    acheminementTotalEur: budget.acheminement.totalEur,
    acciseTotalEur: budget.accise.totalEur,
    ctaTotalEur: budget.cta.totalEur,
    totalHtEur: budget.totalHtEur,
    tvaRate: budget.tva.rate,
    tvaTotalEur: budget.tva.totalEur,
    totalTtcEur: budget.totalTtcEur,
    termYears: budget.termYears,
    termTotalTtcEur: budget.termTotalTtcEur,
  };
}

async function findVersionRow(
  database: D1Database,
  offerVersionId: string,
): Promise<PortalOfferVersionRow | null> {
  const row = await database
    .prepare(
      `SELECT
         offer_version.id, offer_version.organization_id, offer_version.dossier_id,
         offer_version.version_no, offer_version.status,
         offer_version.current_contract_json, offer_version.client_price_lines_json,
         offer_version.comparison_json, offer_version.budget_json,
         offer_version.pdf_r2_key, offer_version.pdf_marketing_r2_key,
         json_extract(offer_version.supplier_offer_json, '$.supplier') AS supplier_name,
         json_extract(offer_version.supplier_offer_json, '$.validUntil') AS valid_until,
         json_extract(offer_version.supplier_offer_json, '$.termYears') AS term_years,
         json_extract(offer_version.supplier_offer_json, '$.subscriptionEurMonth') AS subscription_eur_month
       FROM offer_versions offer_version
       WHERE offer_version.id = ? LIMIT 1`,
    )
    .bind(offerVersionId)
    .first<PortalOfferVersionRow>();
  return row ?? null;
}

async function findClientRow(
  database: D1Database,
  dossierId: string,
): Promise<PortalClientRow | null> {
  const row = await database
    .prepare(
      `SELECT client.legal_name, client.contact_name, site.pdl
       FROM dossiers dossier
       JOIN clients client ON client.id = dossier.client_id
       LEFT JOIN sites site ON site.id = dossier.site_id
       WHERE dossier.id = ? LIMIT 1`,
    )
    .bind(dossierId)
    .first<PortalClientRow>();
  return row ?? null;
}

async function findLatestDeliverySentAt(
  database: D1Database,
  offerVersionId: string,
): Promise<number | null> {
  const row = await database
    .prepare(
      `SELECT sent_at FROM offer_deliveries
       WHERE offer_version_id = ? AND state IN ('SENT', 'DELIVERED') AND sent_at IS NOT NULL
       ORDER BY sent_at DESC LIMIT 1`,
    )
    .bind(offerVersionId)
    .first<{ sent_at: number }>();
  return row?.sent_at ?? null;
}

async function findFirstViewedAt(
  database: D1Database,
  dossierId: string,
  offerVersionId: string,
): Promise<number | null> {
  const row = await database
    .prepare(
      `SELECT MIN(created_at) AS first_viewed_at FROM dossier_events
       WHERE dossier_id = ? AND event_type = 'OFFER_VIEWED'
         AND json_extract(metadata_json, '$.offerVersionId') = ?`,
    )
    .bind(dossierId, offerVersionId)
    .first<{ first_viewed_at: number | null }>();
  return row?.first_viewed_at ?? null;
}

const SECONDS_PER_DAY = 86_400;

/**
 * Records OFFER_VIEWED on the dossier timeline, at most once per UTC day per
 * offer version (the portal is public, so actor_user_id stays NULL).
 */
export async function recordOfferViewed(
  database: D1Database,
  input: {
    organizationId: string;
    dossierId: string;
    offerVersionId: string;
    recipientEmail: string;
  },
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<void> {
  const dayStart = Math.floor(nowSeconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  const existing = await database
    .prepare(
      `SELECT id FROM dossier_events
       WHERE dossier_id = ? AND event_type = 'OFFER_VIEWED'
         AND json_extract(metadata_json, '$.offerVersionId') = ?
         AND created_at >= ?
       LIMIT 1`,
    )
    .bind(input.dossierId, input.offerVersionId, dayStart)
    .first<{ id: string }>();
  if (existing) return;
  await database
    .prepare(
      `INSERT INTO dossier_events (
         id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
       ) VALUES (?, ?, ?, NULL, 'OFFER_VIEWED', 'OFFER_VIEWED', ?)`,
    )
    .bind(
      randomUUID(),
      input.organizationId,
      input.dossierId,
      JSON.stringify({
        offerVersionId: input.offerVersionId,
        recipientEmail: input.recipientEmail,
        channel: "portal",
      }),
    )
    .run();
}

export interface ResolvePortalOfferOptions {
  database?: D1Database;
  /** Defaults to true; the first successful load of the day is tracked. */
  recordView?: boolean;
}

/**
 * Verifies the token and loads everything the portal pages need. Throws only
 * on server misconfiguration (missing PORTAL_TOKEN_SECRET) or infrastructure
 * failure — callers let those bubble to a 500; every content problem maps to
 * a PortalOfferResolution state.
 */
export async function resolvePortalOffer(
  token: string,
  options: ResolvePortalOfferOptions = {},
): Promise<PortalOfferResolution> {
  const database = options.database ?? DatabaseManager.getDatabase();
  const inspection = inspectPortalToken(token);
  if (inspection.status === "invalid") return { kind: "invalid" };
  if (inspection.status === "expired") return { kind: "token-expired" };

  return resolveFromPayload(inspection.payload, database, options.recordView ?? true);
}

async function resolveFromPayload(
  payload: PortalTokenPayload,
  database: D1Database,
  recordView: boolean,
): Promise<PortalOfferResolution> {
  const row = await findVersionRow(database, payload.offerVersionId);
  if (!row) return { kind: "unavailable" };
  const state = portalStateForStatus(row.status);
  if (state !== "ready") return { kind: state };

  const [client, sentAt, viewedAt] = await Promise.all([
    findClientRow(database, row.dossier_id),
    findLatestDeliverySentAt(database, row.id),
    findFirstViewedAt(database, row.dossier_id, row.id),
  ]);

  if (recordView) {
    try {
      await recordOfferViewed(database, {
        organizationId: row.organization_id,
        dossierId: row.dossier_id,
        offerVersionId: row.id,
        recipientEmail: payload.recipientEmail,
      });
    } catch {
      // View tracking must never break the customer-facing page.
    }
  }

  return {
    kind: "ready",
    offer: toPortalOfferView({
      row,
      client,
      sentAt,
      viewedAt,
      recipientEmail: payload.recipientEmail,
    }),
  };
}

export interface LoadPortalDocumentOptions {
  database?: D1Database;
  bucket?: R2Bucket;
}

/**
 * Streams an archived offer PDF for a valid token. Returns null for any
 * token/content problem (the route handler answers 404 — no information
 * leak); throws only on server misconfiguration or infrastructure failure.
 */
export async function loadPortalDocument(
  token: string,
  kind: PortalDocumentKind,
  options: LoadPortalDocumentOptions = {},
): Promise<{ bytes: ArrayBuffer; fileName: string } | null> {
  const inspection = inspectPortalToken(token);
  if (inspection.status !== "valid") return null;

  const database = options.database ?? DatabaseManager.getDatabase();
  const row = await findVersionRow(database, inspection.payload.offerVersionId);
  if (!row || portalStateForStatus(row.status) !== "ready") return null;

  const r2Key = kind === "marketing" ? row.pdf_marketing_r2_key : row.pdf_r2_key;
  if (!r2Key) return null;

  const bucket = options.bucket ?? DocumentStorageManager.getBucket();
  const object = await bucket.get(r2Key);
  if (!object) return null;

  const fileName =
    kind === "marketing"
      ? `offre-savewatt-v${row.version_no}.pdf`
      : `budget-previsionnel-savewatt-v${row.version_no}.pdf`;
  return { bytes: await new Response(object.body).arrayBuffer(), fileName };
}
