import { createHash, randomUUID } from "node:crypto";
import { CrmError } from "@/lib/crm/crm-errors";
import { LEAD_IMPORT_MAX_ROWS, type RawImportRow } from "@/lib/crm/lead-import-rows";
import { sendEmail } from "@/lib/email/email-sender";
import { ExtractionRepository } from "@/lib/extraction/extraction-repository";
import { normalizeBill } from "@/lib/extraction/normalize";
import type { ConsumptionLine, ExtractedBill, ExtractionResult } from "@/lib/extraction/schema";
import { nowPlus, signLink } from "../links.ts";
import type { ToolDef } from "./registry.ts";
import { ADMIN } from "./registry.ts";
import { num, obj, oneOf, str } from "./validate.ts";

type Ctx = Parameters<NonNullable<ToolDef["run"]>>[0];

const UPLOAD_KINDS = ["BILL", "CURRENT_CONTRACT", "SUPPLIER_OFFER"] as const;
const CADRANS = ["HPH", "HCH", "HPE", "HCE", "HP", "HC", "BASE", "POINTE", "TEMPO", "EJP"] as const;
const PRICE_UNITS = ["c€/kWh", "€/kWh", "€/MWh"] as const;
const LEAD_STATUSES = ["NEW", "QUALIFIED", "CONVERTING", "CONVERTED", "LOST"] as const;

const KIND_LABELS: Record<string, string> = {
  BILL: "votre dernière facture d'électricité",
  CURRENT_CONTRACT: "votre contrat d'électricité actuel",
  SUPPLIER_OFFER: "l'offre fournisseur",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

async function uploadLink(ctx: Ctx, dossierId: string, kind: string, hours: number) {
  const expires = nowPlus(hours);
  const token = await signLink(ctx.env.LINK_SECRET ?? "", { t: "u", d: dossierId, k: kind, u: ctx.actor.userId, e: expires });
  return { uploadUrl: `${ctx.origin}/u/${token}`, expiresAt: new Date(expires * 1000).toISOString() };
}

async function requireDossier(ctx: Ctx, dossierId: string) {
  const dossier = await ctx.crm.getDossier(ctx.actor, dossierId);
  if (!dossier) throw new CrmError("CRM_NOT_FOUND", 404);
  return dossier;
}

async function recordEvent(ctx: Ctx, dossierId: string, eventType: string, metadata: Record<string, unknown>) {
  await ctx.db
    .prepare(
      `INSERT INTO dossier_events (
         id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(randomUUID(), ctx.actor.orgId, dossierId, ctx.actor.userId, eventType, eventType, JSON.stringify(metadata))
    .run();
}

/** Dossier for a lead: converts the lead (client + site + dossier) when needed. */
async function dossierForLead(ctx: Ctx, leadId: string): Promise<string> {
  const lead = await ctx.leads.find(ctx.actor, leadId);
  if (!lead) throw new CrmError("CRM_NOT_FOUND", 404);
  if (lead.convertedDossierId) return lead.convertedDossierId;
  const converted = await ctx.crm.convertLead(ctx.actor, leadId);
  return converted.dossierId;
}

function nullableNumber(value: unknown, field: string): number | null {
  return num(value, field) ?? null;
}

function nullableString(value: unknown, field: string, max = 300): string | null {
  return str(value, field, { max }) ?? null;
}

function billFromReading(input: Record<string, unknown>): ExtractedBill {
  if (!Array.isArray(input.consumption) || input.consumption.length === 0) {
    throw new CrmError("CRM_INVALID_INPUT", 400, "consumption");
  }
  const consumption: ConsumptionLine[] = input.consumption.map((entry) => {
    const line = obj(entry, "consumption[]");
    return {
      cadran: oneOf(line.cadran, "cadran", CADRANS)!,
      volumeKwh: nullableNumber(line.volumeKwh, "volumeKwh"),
      unitPricePrinted: nullableNumber(line.unitPricePrinted, "unitPricePrinted"),
      unitPricePrintedUnit: oneOf(line.unitPricePrintedUnit, "unitPricePrintedUnit", PRICE_UNITS, false) ?? null,
      unitPriceEurMwh: nullableNumber(line.unitPriceEurMwh, "unitPriceEurMwh"),
      periodStart: nullableString(line.periodStart, "periodStart", 10),
      periodEnd: nullableString(line.periodEnd, "periodEnd", 10),
      indexStart: null,
      indexEnd: null,
    };
  });
  const totals = input.totals ? obj(input.totals, "totals") : {};
  return normalizeBill({
    supplier: nullableString(input.supplier, "supplier", 120),
    offerName: nullableString(input.offerName, "offerName", 200),
    optionTarifaire:
      oneOf(input.optionTarifaire, "optionTarifaire", ["BASE", "HP/HC", "4_CADRANS", "TEMPO", "EJP", "OTHER"] as const, false) ?? null,
    invoiceNumber: nullableString(input.invoiceNumber, "invoiceNumber", 80),
    invoiceDate: nullableString(input.invoiceDate, "invoiceDate", 10),
    nextInvoiceDate: null,
    billingAccount: null,
    commercialAccount: null,
    siren: nullableString(input.siren, "siren", 9),
    clientName: nullableString(input.clientName, "clientName", 200),
    siteAddress: nullableString(input.siteAddress, "siteAddress", 300),
    pdlOrPrm: nullableString(input.pdlOrPrm, "pdlOrPrm", 14),
    meteringId: null,
    meterType: nullableString(input.meterType, "meterType", 60),
    segment: nullableString(input.segment, "segment", 2),
    routingTariff: nullableString(input.routingTariff, "routingTariff", 120),
    subscribedPowerKva: nullableNumber(input.subscribedPowerKva, "subscribedPowerKva"),
    annualReferenceKwh: nullableNumber(input.annualReferenceKwh, "annualReferenceKwh"),
    subscriptionPrinted: nullableNumber(input.subscriptionPrinted, "subscriptionPrinted"),
    subscriptionPrintedUnit: oneOf(input.subscriptionPrintedUnit, "subscriptionPrintedUnit", ["€/mois", "€/an"] as const, false) ?? null,
    subscriptionEurPerMonth: nullableNumber(input.subscriptionEurPerMonth, "subscriptionEurPerMonth"),
    contractStartDate: nullableString(input.contractStartDate, "contractStartDate", 10),
    contractEndDate: nullableString(input.contractEndDate, "contractEndDate", 10),
    tacitRenewalSuspected: null,
    consumption,
    services: [],
    totals: {
      totalHtEur: nullableNumber(totals.totalHtEur, "totalHtEur"),
      tvaEur: nullableNumber(totals.tvaEur, "tvaEur"),
      totalTtcEur: nullableNumber(totals.totalTtcEur, "totalTtcEur"),
    },
  });
}

const CONSUMPTION_LINE_SCHEMA = {
  type: "object",
  properties: {
    cadran: { type: "string", enum: [...CADRANS], description: "Canonical band (Base → BASE, Heures Pleines Été → HPE…)." },
    volumeKwh: { type: "number", description: "kWh billed for the period." },
    unitPricePrinted: { type: "number", description: "Unit price exactly as printed." },
    unitPricePrintedUnit: { type: "string", enum: [...PRICE_UNITS] },
    unitPriceEurMwh: { type: "number", description: "Same price in €/MWh (c€/kWh × 10, €/kWh × 1000)." },
    periodStart: { type: "string", description: "yyyy-mm-dd" },
    periodEnd: { type: "string", description: "yyyy-mm-dd" },
  },
  required: ["cadran"],
};

export const workflowTools: ToolDef[] = [
  {
    name: "leads.import",
    description:
      "Bulk-import leads from a spreadsheet the user shared (read the Excel/CSV yourself and pass one object per row, " +
      "mapping columns to these fields). Same validation and de-duplication (SIREN, email, phone) as the web import; " +
      `max ${LEAD_IMPORT_MAX_ROWS} rows per call. Returns per-row created/skipped/failed.`,
    status: "live",
    readOnly: false,
    scopes: ["leads:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        idempotencyKey: { type: "string", description: "≥ 8 chars, unique per import (e.g. file name + date). Replays return the first result." },
        fileName: { type: "string" },
        rows: {
          type: "array",
          maxItems: LEAD_IMPORT_MAX_ROWS,
          items: {
            type: "object",
            properties: {
              legalName: { type: "string", description: "Company name (required)." },
              siren: { type: "string", description: "9 digits." },
              contactName: { type: "string" },
              contactEmail: { type: "string" },
              contactPhone: { type: "string" },
              pdl: { type: "string", description: "14-digit PDL/PRM." },
              segment: { type: "string", enum: ["C2", "C3", "C4", "C5"] },
              annualSpend: { type: "number", description: "Estimated annual energy spend (€)." },
              source: { type: "string" },
              notes: { type: "string" },
            },
            required: ["legalName"],
          },
        },
      },
      required: ["idempotencyKey", "rows"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      if (!Array.isArray(value.rows) || value.rows.length === 0) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "rows");
      }
      if (value.rows.length > LEAD_IMPORT_MAX_ROWS) throw new CrmError("CRM_INVALID_INPUT", 400, "rows");
      const rows: RawImportRow[] = value.rows.map((row, index) => ({
        line: index + 2,
        values: { source: "import-claude", ...obj(row, "rows[]") },
      }));
      const result = await ctx.leadImporter.importRows(ctx.actor, {
        rows,
        idempotencyKey: str(value.idempotencyKey, "idempotencyKey", { required: true, max: 120 })!,
        fileName: str(value.fileName, "fileName", { max: 200 }) ?? null,
      });
      return { ...result, note: "Line numbers are spreadsheet rows (row 1 = header)." };
    },
  },
  {
    name: "leads.get",
    description: "Get one lead (status, contact, and its dossier id once converted).",
    status: "live",
    readOnly: true,
    scopes: ["leads:read"],
    roles: ADMIN,
    inputSchema: { type: "object", properties: { leadId: { type: "string" } }, required: ["leadId"] },
    run: async (ctx, args) => {
      const lead = await ctx.leads.find(ctx.actor, str(obj(args).leadId, "leadId", { required: true, max: 100 })!);
      if (!lead) throw new CrmError("CRM_NOT_FOUND", 404);
      return { lead };
    },
  },
  {
    name: "leads.convert",
    description: "Convert a lead into a client + site + dossier (idempotent: returns the existing dossier if already converted).",
    status: "live",
    readOnly: false,
    scopes: ["leads:write", "dossiers:write"],
    roles: ADMIN,
    inputSchema: { type: "object", properties: { leadId: { type: "string" } }, required: ["leadId"] },
    run: async (ctx, args) => {
      const dossierId = await dossierForLead(ctx, str(obj(args).leadId, "leadId", { required: true, max: 100 })!);
      return { dossier: await requireDossier(ctx, dossierId) };
    },
  },
  {
    name: "dossiers.activity",
    description:
      "Track a dossier: timeline events (documents received, extraction, offer queued/sent/bounced…), tasks and documents.",
    status: "live",
    readOnly: true,
    scopes: ["dossiers:read"],
    roles: ADMIN,
    inputSchema: { type: "object", properties: { dossierId: { type: "string" } }, required: ["dossierId"] },
    run: async (ctx, args) => {
      const dossierId = str(obj(args).dossierId, "dossierId", { required: true, max: 100 })!;
      const dossier = await requireDossier(ctx, dossierId);
      const [activity, documents] = await Promise.all([
        ctx.crm.getDossierActivity(ctx.actor, dossierId),
        ctx.documents.list(ctx.actor, dossierId),
      ]);
      return {
        dossier,
        events: activity.events,
        tasks: activity.tasks,
        documents: documents.map((document) => ({
          id: document.id,
          kind: document.kind,
          fileName: document.fileName,
          mimeType: document.mimeType,
          status: document.status,
          createdAt: new Date(document.createdAt * 1000).toISOString(),
        })),
      };
    },
  },
  {
    name: "documents.create_upload_link",
    description:
      "Create a secure upload page for a dossier (no login needed). Use it when the user attached a bill in the chat " +
      "(tool calls cannot carry the file): give them the link, they drop the PDF in 5 seconds, then call bills_extract. " +
      "Also usable to share manually with a client.",
    status: "live",
    readOnly: false,
    scopes: ["dossiers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        leadId: { type: "string", description: "Alternative to dossierId: the lead is converted if needed." },
        kind: { type: "string", enum: [...UPLOAD_KINDS], description: "Defaults to BILL." },
        expiresInHours: { type: "number", description: "1–720, default 72." },
      },
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const leadId = str(value.leadId, "leadId", { max: 100 });
      const dossierId = str(value.dossierId, "dossierId", { max: 100 }) ?? (leadId ? await dossierForLead(ctx, leadId) : null);
      if (!dossierId) throw new CrmError("CRM_INVALID_INPUT", 400, "dossierId");
      await requireDossier(ctx, dossierId);
      const kind = oneOf(value.kind, "kind", UPLOAD_KINDS, false) ?? "BILL";
      const hours = num(value.expiresInHours, "expiresInHours", { min: 1, max: 720 }) ?? 72;
      return { dossierId, kind, ...(await uploadLink(ctx, dossierId, kind, hours)) };
    },
  },
  {
    name: "documents.request_from_client",
    description:
      "Email the client a request for their documents (default: latest electricity bill) with a secure upload link " +
      "(valid 14 days by default). Uploads land in the dossier and appear in dossiers_activity. Accepts a dossierId or a leadId.",
    status: "live",
    readOnly: false,
    scopes: ["dossiers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        leadId: { type: "string" },
        recipientEmail: { type: "string", description: "Defaults to the client contact email." },
        kind: { type: "string", enum: [...UPLOAD_KINDS] },
        message: { type: "string", description: "Optional personal note (plain text, French) added to the email." },
        expiresInDays: { type: "number", description: "1–30, default 14." },
      },
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const leadId = str(value.leadId, "leadId", { max: 100 });
      const dossierId = str(value.dossierId, "dossierId", { max: 100 }) ?? (leadId ? await dossierForLead(ctx, leadId) : null);
      if (!dossierId) throw new CrmError("CRM_INVALID_INPUT", 400, "dossierId");
      await requireDossier(ctx, dossierId);
      const kind = oneOf(value.kind, "kind", UPLOAD_KINDS, false) ?? "BILL";
      const days = num(value.expiresInDays, "expiresInDays", { min: 1, max: 30 }) ?? 14;
      const note = str(value.message, "message", { max: 1500 });

      const contact = await ctx.db
        .prepare(
          `SELECT client.legal_name, client.contact_name, client.contact_email
           FROM dossiers dossier JOIN clients client ON client.id = dossier.client_id
           WHERE dossier.id = ? LIMIT 1`,
        )
        .bind(dossierId)
        .first<{ legal_name: string; contact_name: string | null; contact_email: string | null }>();
      const recipient = (str(value.recipientEmail, "recipientEmail", { max: 200 }) ?? contact?.contact_email ?? "")
        .trim()
        .toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "recipientEmail");
      }

      const link = await uploadLink(ctx, dossierId, kind, days * 24);
      const label = KIND_LABELS[kind];
      const outcome = await sendEmail(
        {
          to: [recipient],
          subject: `SaveWatt — ${label.charAt(0).toUpperCase()}${label.slice(1)} pour votre étude`,
          html: `<div style="font-family:Arial,sans-serif;color:#1d2b25;line-height:1.6;max-width:560px;">
            <p style="font-size:18px;font-weight:700;">Save<span style="color:#118a34;">Watt</span></p>
            <p>Bonjour${contact?.contact_name ? ` ${escapeHtml(contact.contact_name)}` : ""},</p>
            <p>Pour préparer l'étude de <strong>${escapeHtml(contact?.legal_name ?? "votre site")}</strong> et vous proposer
            une offre d'énergie personnalisée, merci de nous transmettre ${label}.</p>
            ${note ? `<p>${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : ""}
            <p><a href="${link.uploadUrl}" style="display:inline-block;background:#118a34;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Déposer mon document</a></p>
            <p style="color:#5b665f;font-size:12px;">Lien sécurisé valable ${days} jours. PDF ou photo, 10 Mo maximum.
            SaveWatt ne vend pas d'énergie : nous vous accompagnons dans le choix de votre contrat.</p>
            <p style="color:#8a938c;font-size:11px;">AX TECH — ECOLED WAVE CONCEPT · 8 rue Marbeau, 75016 Paris</p>
          </div>`,
          text: `Bonjour,\n\nPour préparer votre offre d'énergie personnalisée, merci de nous transmettre ${label} via ce lien sécurisé (valable ${days} jours) :\n${link.uploadUrl}\n\nSaveWatt`,
        },
        ctx.env.EMAIL,
      );
      if (outcome.kind !== "sent") {
        throw new CrmError("CRM_UNAVAILABLE", outcome.kind === "skipped" ? 503 : 502, "email");
      }
      await recordEvent(ctx, dossierId, "DOCUMENTS_REQUESTED", {
        kind,
        recipient,
        expiresAt: link.expiresAt,
        providerMessageId: outcome.providerMessageId,
      });
      return { dossierId, recipientEmail: recipient, kind, ...link, providerMessageId: outcome.providerMessageId };
    },
  },
  {
    name: "bills.submit_reading",
    description:
      "Record a bill YOU read from a file the user attached in the chat (PDF/photo), as a VALIDATED extraction for the " +
      "dossier — no upload needed. Show the values to the user and get their confirmation first. Prices: give the printed " +
      "value + unit (and €/MWh if you can); the subscription as printed. The transcription is archived as a JSON " +
      "document on the dossier. Then: supplier_offers_create_manual → client_offers_create → client_offers_generate_pdf.",
    status: "live",
    readOnly: false,
    scopes: ["bills:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        leadId: { type: "string", description: "Alternative to dossierId: the lead is converted if needed." },
        sourceFileName: { type: "string", description: "Name of the file the user attached." },
        bill: {
          type: "object",
          properties: {
            supplier: { type: "string" },
            offerName: { type: "string" },
            optionTarifaire: { type: "string", enum: ["BASE", "HP/HC", "4_CADRANS", "TEMPO", "EJP", "OTHER"] },
            invoiceNumber: { type: "string" },
            invoiceDate: { type: "string", description: "yyyy-mm-dd" },
            clientName: { type: "string" },
            siren: { type: "string" },
            siteAddress: { type: "string" },
            pdlOrPrm: { type: "string", description: "14 digits." },
            meterType: { type: "string" },
            segment: { type: "string", enum: ["C2", "C3", "C4", "C5"] },
            routingTariff: { type: "string" },
            subscribedPowerKva: { type: "number" },
            annualReferenceKwh: { type: "number" },
            subscriptionPrinted: { type: "number" },
            subscriptionPrintedUnit: { type: "string", enum: ["€/mois", "€/an"] },
            subscriptionEurPerMonth: { type: "number" },
            contractStartDate: { type: "string" },
            contractEndDate: { type: "string" },
            consumption: { type: "array", items: CONSUMPTION_LINE_SCHEMA },
            totals: {
              type: "object",
              properties: { totalHtEur: { type: "number" }, tvaEur: { type: "number" }, totalTtcEur: { type: "number" } },
            },
          },
          required: ["consumption"],
        },
        warnings: { type: "array", items: { type: "string" }, description: "Anything uncertain or missing." },
      },
      required: ["bill"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const leadId = str(value.leadId, "leadId", { max: 100 });
      const dossierId = str(value.dossierId, "dossierId", { max: 100 }) ?? (leadId ? await dossierForLead(ctx, leadId) : null);
      if (!dossierId) throw new CrmError("CRM_INVALID_INPUT", 400, "dossierId");
      await requireDossier(ctx, dossierId);

      const bill = billFromReading(obj(value.bill, "bill"));
      const warnings = Array.isArray(value.warnings)
        ? value.warnings.filter((entry): entry is string => typeof entry === "string").slice(0, 20)
        : [];
      const result: ExtractionResult = {
        bill,
        fieldConfidence: [],
        overallConfidence: 1,
        warnings: [...warnings, "Relevé saisi via Claude à partir du document fourni par l'utilisateur."],
      };

      const sourceFileName = str(value.sourceFileName, "sourceFileName", { max: 200 });
      const bytes = new TextEncoder().encode(
        JSON.stringify({ source: "claude-transcription", sourceFileName, capturedBy: ctx.actor.email, result }, null, 2),
      );
      const fileName = ctx.documentValidation.safeFileName(`releve-facture-${sourceFileName ?? "claude"}.json`);
      const r2Key = `organizations/${ctx.actor.orgId}/dossiers/${dossierId}/${randomUUID()}-${fileName}`;
      const document = await ctx.documents.createPending(ctx.actor, {
        dossierId,
        kind: "BILL",
        r2Key,
        fileName,
        mimeType: "application/json",
        byteSize: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
      await ctx.env.DOCUMENTS.put(r2Key, bytes, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { dossierId, documentId: document.id },
      });
      await ctx.documents.markAvailable(ctx.actor, document);

      const extraction = await new ExtractionRepository(ctx.db, ctx.scopePolicy).create(ctx.actor, {
        documentId: document.id,
        dossierId,
        model: "claude-transcription",
        result,
      });
      const validated = await ctx.extractions.saveValidated(ctx.actor, extraction.id, result);
      return {
        dossierId,
        documentId: document.id,
        extraction: validated,
        next: "supplier_offers_create_manual (Symphonics terms) → client_offers_create → client_offers_generate_pdf",
      };
    },
  },
  {
    name: "pipeline.summary",
    description:
      "Pipeline overview: leads by status, dossiers by stage, offer deliveries (last 30 days) and recent bounces/failures to follow up.",
    status: "live",
    readOnly: true,
    scopes: ["dossiers:read", "leads:read"],
    roles: ADMIN,
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const leadScope = ctx.scopePolicy.resourcePredicate(ctx.actor, "resource_org", "lead.owner_user_id");
      const dossierScope = ctx.scopePolicy.resourcePredicate(ctx.actor, "resource_org", "dossier.owner_user_id");
      const [leads, dossiers, deliveries, problems] = await Promise.all([
        ctx.db
          .prepare(
            `SELECT lead.status, COUNT(*) AS count FROM leads lead
             JOIN organizations resource_org ON resource_org.id = lead.organization_id
             WHERE ${leadScope.sql} GROUP BY lead.status`,
          )
          .bind(...leadScope.bindings)
          .all<{ status: string; count: number }>(),
        ctx.db
          .prepare(
            `SELECT dossier.status, COUNT(*) AS count FROM dossiers dossier
             JOIN organizations resource_org ON resource_org.id = dossier.organization_id
             WHERE ${dossierScope.sql} GROUP BY dossier.status`,
          )
          .bind(...dossierScope.bindings)
          .all<{ status: string; count: number }>(),
        ctx.db
          .prepare(
            `SELECT delivery.state, COUNT(*) AS count FROM offer_deliveries delivery
             JOIN offer_versions version ON version.id = delivery.offer_version_id
             JOIN dossiers dossier ON dossier.id = version.dossier_id
             JOIN organizations resource_org ON resource_org.id = dossier.organization_id
             WHERE ${dossierScope.sql} AND delivery.created_at > unixepoch() - 30 * 86400
             GROUP BY delivery.state`,
          )
          .bind(...dossierScope.bindings)
          .all<{ state: string; count: number }>(),
        ctx.db
          .prepare(
            `SELECT dossier.id AS dossier_id, client.legal_name, delivery.state, delivery.recipient_email,
                    delivery.error, delivery.created_at
             FROM offer_deliveries delivery
             JOIN offer_versions version ON version.id = delivery.offer_version_id
             JOIN dossiers dossier ON dossier.id = version.dossier_id
             JOIN clients client ON client.id = dossier.client_id
             JOIN organizations resource_org ON resource_org.id = dossier.organization_id
             WHERE ${dossierScope.sql} AND delivery.state IN ('BOUNCED', 'FAILED')
             ORDER BY delivery.created_at DESC LIMIT 10`,
          )
          .bind(...dossierScope.bindings)
          .all<{ dossier_id: string; legal_name: string; state: string; recipient_email: string; error: string | null; created_at: number }>(),
      ]);
      const tally = (rows: { count: number }[] | undefined, key: "status" | "state") =>
        Object.fromEntries((rows ?? []).map((row) => [(row as unknown as Record<string, string>)[key], row.count]));
      return {
        leadsByStatus: { ...Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])), ...tally(leads.results, "status") },
        dossiersByStatus: tally(dossiers.results, "status"),
        offerDeliveriesLast30Days: tally(deliveries.results, "state"),
        deliveryProblems: (problems.results ?? []).map((row) => ({
          dossierId: row.dossier_id,
          client: row.legal_name,
          state: row.state,
          recipientEmail: row.recipient_email,
          error: row.error,
          at: new Date(row.created_at * 1000).toISOString(),
        })),
      };
    },
  },
];
