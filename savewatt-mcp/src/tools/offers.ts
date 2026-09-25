import { createHash, randomUUID } from "node:crypto";
import { compare, proposedPrice } from "@/lib/compare";
import { CrmError } from "@/lib/crm/crm-errors";
import type { ExtractionResult } from "@/lib/extraction/schema";
import { computeBudgetPrevisionnel } from "@/lib/offers/estimate";
import { renderOfferBudgetHtml } from "@/lib/offers/offer-pdf-budget";
import { renderOfferMarketingHtml } from "@/lib/offers/offer-pdf-marketing";
import type { OfferVersionRecord } from "@/lib/offers/offer-types";
import { serializeOfferVersionForActor } from "@/lib/offers/offer-visibility";
import { sendEmail } from "@/lib/email/email-sender";
import type { Cadran, CurrentContract, Proposal } from "@/lib/types";
import { nowPlus, signLink } from "../links.ts";
import type { ToolDef } from "./registry.ts";
import { ADMIN } from "./registry.ts";
import { isoDate, num, obj, oneOf, str } from "./validate.ts";

const CADRANS = ["HPH", "HCH", "HPE", "HCE", "HP", "HC", "BASE"] as const;
const PDF_META_FALLBACK = { clientName: "Client", contactName: null, contactEmail: null, pdl: null };
const DOWNLOAD_LINK_HOURS = 72;

type Ctx = Parameters<NonNullable<ToolDef["run"]>>[0];

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

/** Signed, expiring download URLs for both archived PDFs (Claude can hand these to the user). */
async function downloadLinks(
  ctx: Ctx,
  version: OfferVersionRecord,
  pdfs: { budgetR2Key: string; marketingR2Key: string },
): Promise<{ marketingPdfUrl: string; budgetPdfUrl: string; linksExpireAt: string }> {
  const expires = nowPlus(DOWNLOAD_LINK_HOURS);
  const secret = ctx.env.LINK_SECRET ?? "";
  const [marketing, budget] = await Promise.all([
    signLink(secret, { t: "f", r: pdfs.marketingR2Key, f: `offre-savewatt-v${version.versionNo}.pdf`, e: expires }),
    signLink(secret, { t: "f", r: pdfs.budgetR2Key, f: `budget-previsionnel-savewatt-v${version.versionNo}.pdf`, e: expires }),
  ]);
  return {
    marketingPdfUrl: `${ctx.origin}/f/${marketing}`,
    budgetPdfUrl: `${ctx.origin}/f/${budget}`,
    linksExpireAt: new Date(expires * 1000).toISOString(),
  };
}

function toCurrentContract(bill: ExtractionResult["bill"]): CurrentContract {
  // Same mapping as OfferManager.toCurrentContract (private there — mirrored here).
  return {
    supplier: bill.supplier ?? "",
    offerName: bill.offerName ?? "",
    endDate: bill.contractEndDate,
    subscriptionEurMonth: bill.subscriptionEurPerMonth ?? 0,
    subscribedPowerKva: bill.subscribedPowerKva,
    lines: bill.consumption.map((line) => ({
      cadran: line.cadran as Cadran,
      unitPriceEurMwh: line.unitPriceEurMwh ?? 0,
      volumeMwh: line.volumeKwh !== null ? line.volumeKwh / 1000 : 0,
    })),
  };
}

async function latestValidatedBill(
  ctx: Parameters<NonNullable<ToolDef["run"]>>[0],
  dossierId: string,
): Promise<ExtractionResult["bill"] | null> {
  // Same query shape as OfferManager.latestValidatedExtraction (admin tokens
  // are SUPER_ADMIN → unscoped predicate is 1=1 via the scope policy).
  const scope = ctx.scopePolicy.resourcePredicate(ctx.actor, "resource_org", "dossier.owner_user_id");
  const row = await ctx.db
    .prepare(
      `SELECT extraction.validated_json
       FROM extractions extraction
       JOIN dossiers dossier ON dossier.id = extraction.dossier_id
       JOIN organizations resource_org ON resource_org.id = extraction.organization_id
       WHERE extraction.dossier_id = ? AND extraction.status = 'VALIDATED' AND ${scope.sql}
       ORDER BY extraction.validated_at DESC LIMIT 1`,
    )
    .bind(dossierId, ...scope.bindings)
    .first<{ validated_json: string }>();
  return row ? (JSON.parse(row.validated_json) as ExtractionResult["bill"]) : null;
}

async function clientMeta(
  ctx: Parameters<NonNullable<ToolDef["run"]>>[0],
  dossierId: string,
): Promise<{ clientName: string; contactName: string | null; contactEmail: string | null; pdl: string | null }> {
  const row = await ctx.db
    .prepare(
      `SELECT client.legal_name, client.contact_name, client.contact_email, site.pdl
       FROM dossiers dossier
       JOIN clients client ON client.id = dossier.client_id
       LEFT JOIN sites site ON site.id = dossier.site_id
       WHERE dossier.id = ? LIMIT 1`,
    )
    .bind(dossierId)
    .first<{ legal_name: string; contact_name: string | null; contact_email: string | null; pdl: string | null }>();
  return row
    ? { clientName: row.legal_name, contactName: row.contact_name, contactEmail: row.contact_email, pdl: row.pdl }
    : PDF_META_FALLBACK;
}

async function renderAndArchivePdfs(
  ctx: Parameters<NonNullable<ToolDef["run"]>>[0],
  version: OfferVersionRecord,
): Promise<{ budgetR2Key: string; budgetSha256: string; marketingR2Key: string; marketingSha256: string }> {
  // Same artifacts as OfferDeliveryManager.ensurePdfs, but through the worker's
  // own BROWSER/DOCUMENTS bindings (the delivery manager is coupled to the
  // Next/OpenNext runtime context).
  let budgetVersion = version;
  if (!version.budget) {
    const params = await ctx.pricingParams.resolveEffective(ctx.actor);
    if (!params) throw new CrmError("OFFER_PRICING_PARAMETERS_MISSING", 400, "pricingParameters");
    budgetVersion = {
      ...version,
      budget: computeBudgetPrevisionnel({
        lines: version.supplierOffer.lines.map((line) => ({
          cadran: line.cadran,
          annualVolumeMwh: line.annualVolumeMwh,
          finalPriceEurMwh: line.electronEurMwh + version.marginEurMwh,
        })),
        subscriptionEurMonth: version.supplierOffer.subscriptionEurMonth,
        params,
        powerKw: version.currentContract.subscribedPowerKva ?? 0,
        termYears: version.supplierOffer.termYears,
      }),
    };
  }
  const meta = await clientMeta(ctx, version.dossierId);
  const artifacts: { kind: "budget" | "marketing"; html: string }[] = [
    { kind: "budget", html: renderOfferBudgetHtml(budgetVersion, meta, "fr") },
    { kind: "marketing", html: renderOfferMarketingHtml(budgetVersion, meta, "fr") },
  ];
  const out: Record<string, { r2Key: string; sha256: string }> = {};
  for (const artifact of artifacts) {
    const existingKey = artifact.kind === "marketing" ? version.pdfMarketingR2Key : version.pdfR2Key;
    if (existingKey) {
      const existing = await ctx.env.DOCUMENTS.get(existingKey);
      if (existing) {
        out[artifact.kind] = {
          r2Key: existingKey,
          sha256: artifact.kind === "marketing" ? version.pdfMarketingSha256 ?? "" : version.pdfSha256 ?? "",
        };
        continue;
      }
    }
    const response = await ctx.env.BROWSER.fetch("https://example.com/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html: artifact.html, options: { format: "A4", printBackground: true } }),
    });
    if (!response.ok) throw new CrmError("CRM_UNAVAILABLE", 502, "pdf");
    const bytes = await response.arrayBuffer();
    const sha256 = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    const suffix = artifact.kind === "marketing" ? "-marketing" : "";
    const r2Key = `offers/${version.organizationId}/${version.dossierId}/${version.id}/v${version.versionNo}${suffix}.pdf`;
    await ctx.env.DOCUMENTS.put(r2Key, bytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { offerVersionId: version.id, snapshotSha256: version.sha256, kind: artifact.kind },
    });
    out[artifact.kind] = { r2Key, sha256 };
  }
  await ctx.db
    .prepare(
      `UPDATE offer_versions
       SET pdf_r2_key = ?, pdf_sha256 = ?, pdf_marketing_r2_key = ?, pdf_marketing_sha256 = ?
       WHERE id = ?`,
    )
    .bind(out.budget.r2Key, out.budget.sha256, out.marketing.r2Key, out.marketing.sha256, version.id)
    .run();
  return {
    budgetR2Key: out.budget.r2Key,
    budgetSha256: out.budget.sha256,
    marketingR2Key: out.marketing.r2Key,
    marketingSha256: out.marketing.sha256,
  };
}

export const offerTools: ToolDef[] = [
  {
    name: "supplier_offers.create_manual",
    description: "Capture a manual Symphonics supplier offer (per-cadran électron prices, CEE, capacity, subscription) for a dossier.",
    status: "live",
    readOnly: false,
    scopes: ["offers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        validUntil: { type: "string" },
        termYears: { type: "number" },
        ceeEurMwh: { type: "number" },
        capacityEurMwh: { type: "number" },
        subscriptionEurMonth: { type: "number" },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cadran: { type: "string", enum: [...CADRANS] },
              electronEurMwh: { type: "number" },
              annualVolumeMwh: { type: "number" },
            },
            required: ["cadran", "electronEurMwh", "annualVolumeMwh"],
          },
        },
      },
      required: ["dossierId", "termYears", "ceeEurMwh", "capacityEurMwh", "subscriptionEurMonth", "lines"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const dossierId = str(value.dossierId, "dossierId", { required: true, max: 100 })!;
      if (!Array.isArray(value.lines) || value.lines.length === 0) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "lines");
      }
      const lines = value.lines.map((line) => {
        const entry = obj(line, "lines[]");
        return {
          cadran: oneOf(entry.cadran, "cadran", CADRANS)!,
          electronEurMwh: num(entry.electronEurMwh, "electronEurMwh", { min: 0, required: true })!,
          annualVolumeMwh: num(entry.annualVolumeMwh, "annualVolumeMwh", { min: 0, required: true })!,
        };
      });
      const supplierOffer = await ctx.offers.saveSupplierOffer(ctx.actor, dossierId, {
        validUntil: isoDate(value.validUntil, "validUntil"),
        termYears: num(value.termYears, "termYears", { min: 1, max: 6, integer: true, required: true })!,
        ceeEurMwh: num(value.ceeEurMwh, "ceeEurMwh", { min: 0, required: true })!,
        capacityEurMwh: num(value.capacityEurMwh, "capacityEurMwh", { min: 0, required: true })!,
        subscriptionEurMonth: num(value.subscriptionEurMonth, "subscriptionEurMonth", { min: 0, required: true })!,
        sourceDocumentId: str(value.sourceDocumentId, "sourceDocumentId", { max: 100 }),
        lines,
      });
      return { supplierOffer };
    },
  },
  {
    name: "comparisons.run",
    description:
      "Run the comparator + budget preview for a dossier (validated extraction × supplier offer × margin) without persisting an offer version.",
    status: "live",
    readOnly: true,
    scopes: ["offers:read"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        marginEurMwh: { type: "number", description: "Defaults to the effective grid default." },
      },
      required: ["dossierId"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const dossierId = str(value.dossierId, "dossierId", { required: true, max: 100 })!;
      const [bill, supplierOffer, grid, pricingParams] = await Promise.all([
        latestValidatedBill(ctx, dossierId),
        ctx.offers.getSupplierOffer(ctx.actor, dossierId),
        ctx.offers.resolveMarginGrid(ctx.actor),
        ctx.pricingParams.resolveEffective(ctx.actor),
      ]);
      if (!bill) throw new CrmError("OFFER_INPUT_MISSING", 400, "extraction");
      if (!supplierOffer) throw new CrmError("OFFER_INPUT_MISSING", 400, "supplierOffer");
      if (!grid) throw new CrmError("OFFER_MARGIN_GRID_MISSING", 400, "marginGrid");
      if (!pricingParams) throw new CrmError("OFFER_PRICING_PARAMETERS_MISSING", 400, "pricingParameters");
      const margin = num(value.marginEurMwh, "marginEurMwh", { min: 0 }) ?? grid.defaultMarginEurMwh;
      const proposal: Proposal = {
        supplier: "Symphonics",
        ceeEurMwh: supplierOffer.ceeEurMwh,
        capacityEurMwh: supplierOffer.capacityEurMwh,
        subscriptionEurMonth: supplierOffer.subscriptionEurMonth,
        marginEurMwh: margin,
        validUntil: supplierOffer.validUntil,
        termYears: supplierOffer.termYears,
        lines: supplierOffer.lines,
      };
      const currentContract = toCurrentContract(bill);
      const comparison = compare(currentContract, proposal);
      const budgetPreview = computeBudgetPrevisionnel({
        lines: supplierOffer.lines.map((line) => ({
          cadran: line.cadran,
          annualVolumeMwh: line.annualVolumeMwh,
          finalPriceEurMwh: line.electronEurMwh + margin,
        })),
        subscriptionEurMonth: supplierOffer.subscriptionEurMonth,
        params: pricingParams,
        powerKw: bill.subscribedPowerKva ?? 0,
        termYears: supplierOffer.termYears,
      });
      return {
        comparison,
        budgetPreview,
        marginEurMwh: margin,
        clientPriceLines: supplierOffer.lines.map((line) => ({
          cadran: line.cadran,
          priceEurMwh: proposedPrice(proposal, line.electronEurMwh),
        })),
      };
    },
  },
  {
    name: "client_offers.create",
    description:
      "Create an immutable offer version (comparison + client price lines + budget prévisionnel snapshot) for a dossier.",
    status: "live",
    readOnly: false,
    scopes: ["offers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        marginEurMwh: { type: "number" },
        marginOverrideReason: { type: "string" },
      },
      required: ["dossierId"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const dossierId = str(value.dossierId, "dossierId", { required: true, max: 100 })!;
      const offerVersion = await ctx.offers.createOfferVersion(ctx.actor, dossierId, {
        marginEurMwh: num(value.marginEurMwh, "marginEurMwh", { min: 0 }),
        marginOverrideReason: str(value.marginOverrideReason, "marginOverrideReason", { max: 500 }),
      });
      return { offerVersion };
    },
  },
  {
    name: "client_offers.generate_pdf",
    description:
      "Render and archive both offer PDFs (budget prévisionnel + marketing) for an offer version via Browser Rendering + R2.",
    status: "live",
    readOnly: false,
    scopes: ["offers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { offerVersionId: { type: "string" } },
      required: ["offerVersionId"],
    },
    run: async (ctx, args) => {
      const offerVersionId = str(obj(args).offerVersionId, "offerVersionId", { required: true, max: 100 })!;
      const version = await ctx.offerVersions.find(ctx.actor, offerVersionId);
      if (!version) throw new CrmError("CRM_NOT_FOUND", 404);
      const result = await renderAndArchivePdfs(ctx, version);
      return { offerVersionId: version.id, ...result, ...(await downloadLinks(ctx, version, result)) };
    },
  },
  {
    name: "client_offers.list",
    description: "List the offer versions of a dossier (status, margin, annual saving, PDFs, delivery state).",
    status: "live",
    readOnly: true,
    scopes: ["offers:read"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { dossierId: { type: "string" } },
      required: ["dossierId"],
    },
    run: async (ctx, args) => {
      const dossierId = str(obj(args).dossierId, "dossierId", { required: true, max: 100 })!;
      const versions = await ctx.offers.listOfferVersions(ctx.actor, dossierId);
      const deliveries = await ctx.db
        .prepare(
          `SELECT delivery.offer_version_id, delivery.state, delivery.recipient_email, delivery.error, delivery.sent_at
           FROM offer_deliveries delivery
           JOIN offer_versions version ON version.id = delivery.offer_version_id
           WHERE version.dossier_id = ?
           ORDER BY delivery.sent_at DESC`,
        )
        .bind(dossierId)
        .all<{ offer_version_id: string; state: string; recipient_email: string; error: string | null; sent_at: number | null }>();
      return {
        offerVersions: versions.map((version) => ({
          ...serializeOfferVersionForActor(ctx.actor, version),
          deliveries: (deliveries.results ?? [])
            .filter((row) => row.offer_version_id === version.id)
            .map((row) => ({
              state: row.state,
              recipientEmail: row.recipient_email,
              error: row.error,
              sentAt: row.sent_at ? new Date(row.sent_at * 1000).toISOString() : null,
            })),
        })),
        count: versions.length,
      };
    },
  },
  {
    name: "client_offers.approve",
    description:
      "Approve an offer version that is APPROVAL_REQUIRED (margin outside the grid) so it can be sent.",
    status: "live",
    readOnly: false,
    scopes: ["offers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { offerVersionId: { type: "string" } },
      required: ["offerVersionId"],
    },
    run: async (ctx, args) => {
      const offerVersionId = str(obj(args).offerVersionId, "offerVersionId", { required: true, max: 100 })!;
      const offerVersion = await ctx.offers.approveOfferVersion(ctx.actor, offerVersionId);
      return { offerVersion };
    },
  },
  {
    name: "client_offers.send",
    description:
      "Email an offer version to the client (Cloudflare Email, from offres@savewatt.fr) with both PDFs attached. " +
      "The delivery is QUEUED until the provider confirms delivery; the version then becomes SENT and the dossier 'sent' " +
      "(bounces are recorded). Check with client_offers_list or dossiers_activity.",
    status: "live",
    readOnly: false,
    scopes: ["offers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        offerVersionId: { type: "string" },
        recipientEmail: { type: "string", description: "Defaults to the client contact email." },
        idempotencyKey: { type: "string", description: "≥ 8 chars, unique per send; replays return the recorded delivery." },
      },
      required: ["offerVersionId", "idempotencyKey"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const offerVersionId = str(value.offerVersionId, "offerVersionId", { required: true, max: 100 })!;
      const idempotencyKey = str(value.idempotencyKey, "idempotencyKey", { required: true, max: 120 })!;
      if (idempotencyKey.length < 8) throw new CrmError("CRM_INVALID_INPUT", 400, "idempotencyKey");

      const replayed = await ctx.db
        .prepare(`SELECT id, state, recipient_email FROM offer_deliveries WHERE idempotency_key = ? LIMIT 1`)
        .bind(idempotencyKey)
        .first<{ id: string; state: string; recipient_email: string }>();
      if (replayed) {
        return { deliveryId: replayed.id, state: replayed.state, recipientEmail: replayed.recipient_email, replayed: true };
      }

      const version = await ctx.offerVersions.find(ctx.actor, offerVersionId);
      if (!version) throw new CrmError("CRM_NOT_FOUND", 404);
      if (!["DRAFT", "APPROVED"].includes(version.status)) {
        throw new CrmError("CRM_CONFLICT", 409, "status");
      }
      const inFlight = await ctx.db
        .prepare(
          `SELECT 1 AS found FROM offer_deliveries
           WHERE offer_version_id = ? AND state = 'QUEUED' AND created_at > unixepoch() - 1800 LIMIT 1`,
        )
        .bind(offerVersionId)
        .first<{ found: number }>();
      if (inFlight) throw new CrmError("CRM_CONFLICT", 409, "delivery");

      const meta = await clientMeta(ctx, version.dossierId);
      const recipient = (str(value.recipientEmail, "recipientEmail", { max: 200 }) ?? meta.contactEmail ?? "")
        .trim()
        .toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "recipientEmail");
      }
      const pdfs = await renderAndArchivePdfs(ctx, version);
      const [marketing, budget] = await Promise.all([
        ctx.env.DOCUMENTS.get(pdfs.marketingR2Key),
        ctx.env.DOCUMENTS.get(pdfs.budgetR2Key),
      ]);
      if (!marketing || !budget) throw new CrmError("CRM_UNAVAILABLE", 502, "pdf");

      const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
      const clientName = escapeHtml(meta.clientName);
      const outcome = await sendEmail(
        {
          to: [recipient],
          subject: `Votre offre d'énergie SaveWatt — ${meta.clientName}`,
          html: `<div style="font-family:Arial,sans-serif;color:#1d2b25;line-height:1.6;max-width:560px;">
            <p style="font-size:18px;font-weight:700;">Save<span style="color:#118a34;">Watt</span></p>
            <p>Bonjour${meta.contactName ? ` ${escapeHtml(meta.contactName)}` : ""},</p>
            <p>Votre offre d'énergie personnalisée pour <strong>${clientName}</strong> est prête :
            une économie estimée à <strong>${money.format(version.comparison.annualSaving)} par an</strong>
            sur ${version.comparison.termYears} an(s), à périmètre identique.</p>
            <p>Retrouvez en pièces jointes votre offre en un coup d'œil et le budget
            prévisionnel détaillé (consommation, prix par cadran, décomposition complète HT/TTC).</p>
            <p style="color:#5b665f;font-size:12px;">Cette offre est valable jusqu'au ${escapeHtml(version.supplierOffer.validUntil ?? "—")}.
            SaveWatt ne vend pas d'énergie : nous vous accompagnons dans le choix de votre contrat.</p>
            <p style="color:#8a938c;font-size:11px;">AX TECH — ECOLED WAVE CONCEPT · 8 rue Marbeau, 75016 Paris</p>
          </div>`,
          attachments: [
            {
              filename: `offre-savewatt-v${version.versionNo}.pdf`,
              content: base64FromBytes(new Uint8Array(await marketing.arrayBuffer())),
              type: "application/pdf",
            },
            {
              filename: `budget-previsionnel-savewatt-v${version.versionNo}.pdf`,
              content: base64FromBytes(new Uint8Array(await budget.arrayBuffer())),
              type: "application/pdf",
            },
          ],
        },
        ctx.env.EMAIL,
      );
      if (outcome.kind !== "sent") {
        const message = outcome.kind === "skipped" ? "EMAIL binding missing" : outcome.error;
        await recordDelivery(ctx, offerVersionId, idempotencyKey, recipient, "FAILED", null, message);
        throw new CrmError("CRM_UNAVAILABLE", outcome.kind === "skipped" ? 503 : 502, "email");
      }
      // Accepted only: the delivered callback (platform queue consumer) marks the version SENT.
      const delivery = await recordDelivery(
        ctx,
        offerVersionId,
        idempotencyKey,
        recipient,
        "QUEUED",
        outcome.providerMessageId,
        null,
      );
      await ctx.db
        .prepare(
          `INSERT INTO dossier_events (
             id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
           ) VALUES (?, ?, ?, ?, 'OFFER_QUEUED', 'OFFER_QUEUED', ?)`,
        )
        .bind(
          randomUUID(),
          ctx.actor.orgId,
          version.dossierId,
          ctx.actor.userId,
          JSON.stringify({ offerVersionId, versionNo: version.versionNo, recipient, deliveryId: delivery.id }),
        )
        .run();
      return {
        state: "QUEUED",
        deliveryId: delivery.id,
        providerMessageId: outcome.providerMessageId,
        recipientEmail: recipient,
        note: "Accepted by the email service; becomes DELIVERED/SENT when delivery is confirmed.",
      };
    },
  },
];

async function recordDelivery(
  ctx: Ctx,
  offerVersionId: string,
  idempotencyKey: string,
  recipient: string,
  state: "QUEUED" | "FAILED",
  providerMessageId: string | null,
  error: string | null,
): Promise<{ id: string }> {
  const id = randomUUID();
  await ctx.db
    .prepare(
      `INSERT INTO offer_deliveries (
         id, offer_version_id, idempotency_key, recipient_email, state,
         provider_message_id, error, sent_by_user_id, sent_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
    )
    .bind(id, offerVersionId, idempotencyKey, recipient, state, providerMessageId, error, ctx.actor.userId)
    .run();
  return { id };
}
