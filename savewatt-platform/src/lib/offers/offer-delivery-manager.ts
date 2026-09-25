import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WorkspaceActor } from "@/lib/access-control";
import { DocumentStorageManager } from "@/lib/cloudflare/document-storage-manager";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { sendEmail, type EmailBinding } from "@/lib/email/email-sender";
import { computeBudgetPrevisionnel, type BudgetPrevisionnel } from "./estimate";
import { renderOfferBudgetHtml } from "./offer-pdf-budget";
import { renderOfferMarketingHtml } from "./offer-pdf-marketing";
import { OfferVersionRepository } from "./offer-version-repository";
import { PricingParameterRepository } from "./pricing-parameter-repository";
import type { OfferVersionRecord } from "./offer-types";

export type OfferPdfKind = "budget" | "marketing";

interface PdfArtifact {
  bytes: ArrayBuffer;
  sha256: string;
  r2Key: string;
}

export interface DeliveryResult {
  deliveryId: string;
  state: "QUEUED" | "DELIVERED" | "FAILED";
  recipientEmail: string;
  providerMessageId: string | null;
  error: string | null;
}

interface DeliveryRow {
  id: string;
  offer_version_id: string;
  idempotency_key: string;
  recipient_email: string;
  state: "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "FAILED";
  provider_message_id: string | null;
  error: string | null;
  sent_at: number | null;
}

interface ClientMeta {
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  pdl: string | null;
  dossierStatus: string;
  dossierVersion: number;
}

export class OfferDeliveryManager {
  constructor(
    private readonly offerVersions = new OfferVersionRepository(),
    private readonly pricingParameters = new PricingParameterRepository(),
    private readonly dossiers = new DossierRepository(),
    private readonly database: D1Database = DatabaseManager.getDatabase(),
  ) {}

  async getPdf(
    actor: WorkspaceActor,
    offerVersionId: string,
    kind: OfferPdfKind = "budget",
  ): Promise<{ bytes: ArrayBuffer; fileName: string } | null> {
    const version = await this.offerVersions.find(actor, offerVersionId);
    if (!version) return null;
    const r2Key = kind === "marketing" ? version.pdfMarketingR2Key : version.pdfR2Key;
    if (!r2Key) return null;
    const object = await DocumentStorageManager.getBucket().get(r2Key);
    if (!object) return null;
    const fileName =
      kind === "marketing"
        ? `offre-savewatt-v${version.versionNo}.pdf`
        : `budget-previsionnel-savewatt-v${version.versionNo}.pdf`;
    return {
      bytes: await new Response(object.body).arrayBuffer(),
      fileName,
    };
  }

  async send(
    actor: WorkspaceActor,
    offerVersionId: string,
    options: { recipientEmail?: string | null; idempotencyKey: string },
  ): Promise<DeliveryResult> {
    if (!options.idempotencyKey || options.idempotencyKey.length < 8) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "idempotencyKey");
    }
    const replayed = await this.findDelivery(options.idempotencyKey);
    if (replayed) return this.toResult(replayed);

    const version = await this.offerVersions.find(actor, offerVersionId);
    if (!version) throw new CrmError("CRM_NOT_FOUND", 404);
    if (!["DRAFT", "APPROVED"].includes(version.status)) {
      throw new CrmError("CRM_CONFLICT", 409, "status");
    }
    if (await this.hasDeliveryInFlight(offerVersionId)) {
      throw new CrmError("CRM_CONFLICT", 409, "delivery");
    }

    const meta = await this.clientMeta(actor, version.dossierId);
    const recipient = (options.recipientEmail ?? meta.contactEmail ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "recipientEmail");
    }

    let pdfs: { budget: PdfArtifact; marketing: PdfArtifact };
    try {
      pdfs = await this.ensurePdfs(actor, version, meta);
    } catch (error) {
      await this.recordDelivery(actor, offerVersionId, options.idempotencyKey, recipient, "FAILED", null, errorMessage(error));
      throw error instanceof CrmError ? error : new CrmError("CRM_UNAVAILABLE", 502, "pdf");
    }

    const locale = "fr";
    const subject = `Votre offre d'énergie SaveWatt — ${meta.clientName}`;
    const html = this.emailHtml(version, meta, locale);

    let providerMessageId: string | null = null;
    const outcome = await sendEmail(
      {
        to: [recipient],
        subject,
        html,
        attachments: [
          {
            filename: `offre-savewatt-v${version.versionNo}.pdf`,
            content: base64FromBytes(new Uint8Array(pdfs.marketing.bytes)),
            type: "application/pdf",
          },
          {
            filename: `budget-previsionnel-savewatt-v${version.versionNo}.pdf`,
            content: base64FromBytes(new Uint8Array(pdfs.budget.bytes)),
            type: "application/pdf",
          },
        ],
      },
      getCloudflareContext().env.EMAIL as EmailBinding | undefined,
    );
    if (outcome.kind === "sent") {
      providerMessageId = outcome.providerMessageId;
    } else {
      const message =
        outcome.kind === "skipped" ? "EMAIL binding missing" : outcome.error;
      await this.recordDelivery(actor, offerVersionId, options.idempotencyKey, recipient, "FAILED", null, message);
      throw new CrmError("CRM_UNAVAILABLE", outcome.kind === "skipped" ? 503 : 502, "email");
    }

    // Accepted by Email Service only: the version becomes SENT (and the dossier
    // `sent`) when the delivered callback arrives (offer-delivery-events.ts).
    const delivery = await this.recordDelivery(
      actor,
      offerVersionId,
      options.idempotencyKey,
      recipient,
      "QUEUED",
      providerMessageId,
      null,
    );
    await this.recordEvent(actor, version.dossierId, "OFFER_QUEUED", {
      offerVersionId,
      versionNo: version.versionNo,
      recipient,
      deliveryId: delivery.id,
    });
    return this.toResult(delivery);
  }

  private async hasDeliveryInFlight(offerVersionId: string): Promise<boolean> {
    const row = await this.database
      .prepare(
        `SELECT 1 AS found FROM offer_deliveries
         WHERE offer_version_id = ? AND state = 'QUEUED' AND created_at > unixepoch() - 1800
         LIMIT 1`,
      )
      .bind(offerVersionId)
      .first<{ found: number }>();
    return Boolean(row);
  }

  /**
   * Render (once) and archive both immutable PDFs for this offer version:
   * the Symphonics-style budget prévisionnel and the marketing one-pager.
   */
  private async ensurePdfs(
    actor: WorkspaceActor,
    version: OfferVersionRecord,
    meta: ClientMeta,
  ): Promise<{ budget: PdfArtifact; marketing: PdfArtifact }> {
    const browser = getCloudflareContext().env.BROWSER;
    if (!browser) {
      throw new CrmError("CRM_UNAVAILABLE", 503, "browser");
    }
    const budget = await this.ensureBudget(actor, version);
    const budgetVersion = budget === version.budget ? version : { ...version, budget };
    const [budgetPdf, marketingPdf] = await Promise.all([
      this.ensureArtifact(browser, version, "budget", () =>
        renderOfferBudgetHtml(budgetVersion, meta, "fr"),
      ),
      this.ensureArtifact(browser, version, "marketing", () =>
        renderOfferMarketingHtml(budgetVersion, meta, "fr"),
      ),
    ]);
    await this.database
      .prepare(
        `UPDATE offer_versions
         SET pdf_r2_key = ?, pdf_sha256 = ?, pdf_marketing_r2_key = ?, pdf_marketing_sha256 = ?
         WHERE id = ?`,
      )
      .bind(budgetPdf.r2Key, budgetPdf.sha256, marketingPdf.r2Key, marketingPdf.sha256, version.id)
      .run();
    return { budget: budgetPdf, marketing: marketingPdf };
  }

  private async ensureArtifact(
    browser: { fetch(input: string, init?: RequestInit): Promise<Response> },
    version: OfferVersionRecord,
    kind: OfferPdfKind,
    render: () => string,
  ): Promise<PdfArtifact> {
    const existingKey = kind === "marketing" ? version.pdfMarketingR2Key : version.pdfR2Key;
    if (existingKey) {
      const object = await DocumentStorageManager.getBucket().get(existingKey);
      if (object) {
        return {
          bytes: await new Response(object.body).arrayBuffer(),
          sha256: kind === "marketing" ? version.pdfMarketingSha256 ?? "" : version.pdfSha256 ?? "",
          r2Key: existingKey,
        };
      }
    }
    const response = await browser.fetch("https://example.com/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html: render(), options: { format: "A4", printBackground: true } }),
    });
    if (!response.ok) {
      throw new CrmError("CRM_UNAVAILABLE", 502, "pdf");
    }
    const bytes = await response.arrayBuffer();
    const sha256 = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    const suffix = kind === "marketing" ? `-marketing` : "";
    const r2Key = `offers/${version.organizationId}/${version.dossierId}/${version.id}/v${version.versionNo}${suffix}.pdf`;
    await DocumentStorageManager.getBucket().put(r2Key, bytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { offerVersionId: version.id, snapshotSha256: version.sha256, kind },
    });
    return { bytes, sha256, r2Key };
  }

  /**
   * Budget snapshot for rendering. Versions created before migration 0014 have
   * no budget_json: recompute it from the immutable snapshot inputs and the
   * effective pricing parameters (derived data, server-side only).
   */
  private async ensureBudget(
    actor: WorkspaceActor,
    version: OfferVersionRecord,
  ): Promise<BudgetPrevisionnel> {
    if (version.budget) return version.budget;
    const params = await this.pricingParameters.resolveEffective(actor);
    if (!params) throw new CrmError("OFFER_PRICING_PARAMETERS_MISSING", 400, "pricingParameters");
    return computeBudgetPrevisionnel({
      lines: version.supplierOffer.lines.map((line) => ({
        cadran: line.cadran,
        annualVolumeMwh: line.annualVolumeMwh,
        finalPriceEurMwh: line.electronEurMwh + version.marginEurMwh,
      })),
      subscriptionEurMonth: version.supplierOffer.subscriptionEurMonth,
      params,
      powerKw: version.currentContract.subscribedPowerKva ?? 0,
      termYears: version.supplierOffer.termYears,
    });
  }

  private async clientMeta(actor: WorkspaceActor, dossierId: string): Promise<ClientMeta> {
    const dossier = await this.dossiers.find(actor, dossierId);
    if (!dossier) throw new CrmError("CRM_NOT_FOUND", 404);
    const row = await this.database
      .prepare(
        `SELECT client.legal_name, client.contact_name, client.contact_email, site.pdl
         FROM dossiers dossier
         JOIN clients client ON client.id = dossier.client_id
         LEFT JOIN sites site ON site.id = dossier.site_id
         WHERE dossier.id = ? LIMIT 1`,
      )
      .bind(dossierId)
      .first<{ legal_name: string; contact_name: string | null; contact_email: string | null; pdl: string | null }>();
    return {
      clientName: row?.legal_name ?? dossier.clientName,
      contactName: row?.contact_name ?? null,
      contactEmail: row?.contact_email ?? null,
      pdl: row?.pdl ?? dossier.pdl,
      dossierStatus: dossier.status,
      dossierVersion: dossier.version,
    };
  }

  private emailHtml(version: OfferVersionRecord, meta: ClientMeta, locale: string): string {
    const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    return `<div style="font-family:Arial,sans-serif;color:#1d2b25;line-height:1.6;max-width:560px;">
      <p style="font-size:18px;font-weight:700;">Save<span style="color:#118a34;">Watt</span></p>
      <p>Bonjour${meta.contactName ? ` ${meta.contactName}` : ""},</p>
      <p>Votre offre d'énergie personnalisée pour <strong>${meta.clientName}</strong> est prête :
      une économie estimée à <strong>${money.format(version.comparison.annualSaving)} par an</strong>
      sur ${version.comparison.termYears} an(s), à périmètre identique.</p>
      <p>Retrouvez en pièces jointes votre offre en un coup d'œil et le budget
      prévisionnel détaillé (consommation, prix par cadran, décomposition complète HT/TTC).</p>
      <p style="color:#5b665f;font-size:12px;">Cette offre est valable jusqu'au ${version.supplierOffer.validUntil ?? "—"}.
      SaveWatt ne vend pas d'énergie : nous vous accompagnons dans le choix de votre contrat.</p>
      <p style="color:#8a938c;font-size:11px;">AX TECH — ECOLED WAVE CONCEPT · 8 rue Marbeau, 75016 Paris</p>
    </div>`;
  }

  private async findDelivery(idempotencyKey: string): Promise<DeliveryRow | null> {
    const row = await this.database
      .prepare(`SELECT * FROM offer_deliveries WHERE idempotency_key = ? LIMIT 1`)
      .bind(idempotencyKey)
      .first<DeliveryRow>();
    return row ?? null;
  }

  private async recordDelivery(
    actor: WorkspaceActor,
    offerVersionId: string,
    idempotencyKey: string,
    recipient: string,
    state: DeliveryRow["state"],
    providerMessageId: string | null,
    error: string | null,
  ): Promise<DeliveryRow> {
    const id = randomUUID();
    try {
      await this.database
        .prepare(
          `INSERT INTO offer_deliveries (
             id, offer_version_id, idempotency_key, recipient_email, state,
             provider_message_id, error, sent_by_user_id, sent_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
        )
        .bind(id, offerVersionId, idempotencyKey, recipient, state, providerMessageId, error, actor.userId)
        .run();
    } catch (failure) {
      if (failure instanceof Error && failure.message.includes("UNIQUE")) {
        const existing = await this.findDelivery(idempotencyKey);
        if (existing) return existing;
      }
      throw failure;
    }
    const row = await this.findDelivery(idempotencyKey);
    if (!row) throw new Error("DELIVERY_NOT_RECORDED");
    return row;
  }

  private toResult(row: DeliveryRow): DeliveryResult {
    return {
      deliveryId: row.id,
      state:
        row.state === "DELIVERED"
          ? "DELIVERED"
          : row.state === "QUEUED" || row.state === "SENT"
            ? "QUEUED"
            : "FAILED",
      recipientEmail: row.recipient_email,
      providerMessageId: row.provider_message_id,
      error: row.error,
    };
  }

  private async recordEvent(
    actor: WorkspaceActor,
    dossierId: string,
    eventType: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO dossier_events (
           id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(randomUUID(), actor.orgId, dossierId, actor.userId, eventType, eventType, JSON.stringify(metadata))
      .run();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
