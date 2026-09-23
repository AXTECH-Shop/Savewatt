import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WorkspaceActor } from "@/lib/access-control";
import { DocumentStorageManager } from "@/lib/cloudflare/document-storage-manager";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { renderOfferHtml } from "./offer-pdf";
import { OfferVersionRepository } from "./offer-version-repository";
import type { OfferVersionRecord } from "./offer-types";

export interface DeliveryResult {
  deliveryId: string;
  state: "SENT" | "FAILED";
  recipientEmail: string;
  providerMessageId: string | null;
  error: string | null;
  offerVersionStatus: OfferVersionRecord["status"];
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
    private readonly dossiers = new DossierRepository(),
    private readonly database: D1Database = DatabaseManager.getDatabase(),
  ) {}

  async getPdf(actor: WorkspaceActor, offerVersionId: string): Promise<{ bytes: ArrayBuffer; fileName: string } | null> {
    const version = await this.offerVersions.find(actor, offerVersionId);
    if (!version || !version.pdfR2Key) return null;
    const object = await DocumentStorageManager.getBucket().get(version.pdfR2Key);
    if (!object) return null;
    return {
      bytes: await new Response(object.body).arrayBuffer(),
      fileName: `offre-savewatt-v${version.versionNo}.pdf`,
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

    const meta = await this.clientMeta(actor, version.dossierId);
    const recipient = (options.recipientEmail ?? meta.contactEmail ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "recipientEmail");
    }

    let pdf: { bytes: ArrayBuffer; sha256: string; r2Key: string };
    try {
      pdf = await this.ensurePdf(version, meta);
    } catch (error) {
      await this.recordDelivery(actor, offerVersionId, options.idempotencyKey, recipient, "FAILED", null, errorMessage(error));
      throw error instanceof CrmError ? error : new CrmError("CRM_UNAVAILABLE", 502, "pdf");
    }

    const locale = "fr";
    const subject = `Votre offre d'énergie SaveWatt — ${meta.clientName}`;
    const html = this.emailHtml(version, meta, locale);
    const pdfBase64 = base64FromBytes(new Uint8Array(pdf.bytes));

    let providerMessageId: string | null = null;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${resendApiKey()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: "SaveWatt <offres@savewatt.fr>",
          to: [recipient],
          subject,
          html,
          attachments: [
            {
              filename: `offre-savewatt-v${version.versionNo}.pdf`,
              content: pdfBase64,
            },
          ],
        }),
      });
      const body = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? `Resend responded ${response.status}`);
      }
      providerMessageId = body.id ?? null;
    } catch (error) {
      const message = errorMessage(error);
      await this.recordDelivery(actor, offerVersionId, options.idempotencyKey, recipient, "FAILED", null, message);
      throw new CrmError("CRM_UNAVAILABLE", 502, "email");
    }

    const delivery = await this.recordDelivery(
      actor,
      offerVersionId,
      options.idempotencyKey,
      recipient,
      "SENT",
      providerMessageId,
      null,
    );
    await this.offerVersions.updateStatus(actor, offerVersionId, "SENT");

    if (meta.dossierStatus === "proposalReady") {
      try {
        await this.dossiers.updateStatus(actor, version.dossierId, "sent", meta.dossierVersion);
      } catch {
        // Dossier may already be advanced; delivery stays authoritative.
      }
    }
    await this.recordEvent(actor, version.dossierId, "OFFER_SENT", {
      offerVersionId,
      versionNo: version.versionNo,
      recipient,
      deliveryId: delivery.id,
    });
    return this.toResult(delivery);
  }

  /** Render (once) and archive the immutable PDF for this offer version. */
  private async ensurePdf(
    version: OfferVersionRecord,
    meta: ClientMeta,
  ): Promise<{ bytes: ArrayBuffer; sha256: string; r2Key: string }> {
    if (version.pdfR2Key) {
      const object = await DocumentStorageManager.getBucket().get(version.pdfR2Key);
      if (object) {
        return { bytes: await new Response(object.body).arrayBuffer(), sha256: version.pdfSha256 ?? "", r2Key: version.pdfR2Key };
      }
    }

    const html = renderOfferHtml(version, meta, "fr");
    const browser = getCloudflareContext().env.BROWSER;
    if (!browser) {
      throw new CrmError("CRM_UNAVAILABLE", 503, "browser");
    }
    const response = await browser.fetch("https://example.com/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html, options: { format: "A4", printBackground: true } }),
    });
    if (!response.ok) {
      throw new CrmError("CRM_UNAVAILABLE", 502, "pdf");
    }
    const bytes = await response.arrayBuffer();
    const sha256 = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    const r2Key = `offers/${version.organizationId}/${version.dossierId}/${version.id}/v${version.versionNo}.pdf`;
    await DocumentStorageManager.getBucket().put(r2Key, bytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { offerVersionId: version.id, snapshotSha256: version.sha256 },
    });
    await this.database
      .prepare(`UPDATE offer_versions SET pdf_r2_key = ?, pdf_sha256 = ? WHERE id = ?`)
      .bind(r2Key, sha256, version.id)
      .run();
    return { bytes, sha256, r2Key };
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
      <p>Retrouvez le détail complet des prix et de la comparaison dans le document PDF joint.</p>
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
      state: row.state === "SENT" || row.state === "DELIVERED" ? "SENT" : "FAILED",
      recipientEmail: row.recipient_email,
      providerMessageId: row.provider_message_id,
      error: row.error,
      offerVersionStatus: "SENT",
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

function resendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new CrmError("CRM_UNAVAILABLE", 503, "email");
  return key;
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
