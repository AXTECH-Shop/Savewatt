import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { DocumentStorageManager } from "@/lib/cloudflare/document-storage-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { LeadRepository } from "@/lib/crm/lead-repository";
import type { CreateLeadInput } from "@/lib/crm/crm-types";
import { DocumentRepository } from "@/lib/documents/document-repository";
import { DocumentValidationManager } from "@/lib/documents/document-validation-manager";
import { sendEmail, type EmailBinding } from "@/lib/email/email-sender";
import { ExtractionRepository } from "@/lib/extraction/extraction-repository";
import { extractBill, GEMINI_MODEL } from "@/lib/extraction/gemini";
import type { ConsumptionLine, ExtractedBill, ExtractionResult } from "@/lib/extraction/schema";
import { MarginGridRepository } from "@/lib/offers/margin-grid-repository";
import { OfferDeliveryManager } from "@/lib/offers/offer-delivery-manager";
import { OfferManager } from "@/lib/offers/offer-manager";
import type { OfferVersionRecord } from "@/lib/offers/offer-types";
import { OfferVersionRepository } from "@/lib/offers/offer-version-repository";
import { PricingParameterRepository } from "@/lib/offers/pricing-parameter-repository";
import { SupplierOfferRepository } from "@/lib/offers/supplier-offer-repository";
import type { DossierStatus, Segment } from "@/lib/types";
import {
  autoSendIssues,
  INTAKE_ISSUES,
  planIntakeOffer,
  type IntakeIssue,
  type IntakePlan,
} from "./intake-plan";
import { ReferenceTermsRepository, type ReferenceTermsRecord } from "./reference-terms-repository";

export const WEB_INTAKE_USER_ID = "system_web_intake";

/** Owner of everything the public ad form creates; never signs in. */
export const WEB_INTAKE_ACTOR: WorkspaceActor = {
  userId: WEB_INTAKE_USER_ID,
  displayName: "Formulaire web SaveWatt",
  email: "web-intake@system.savewatt.fr",
  role: "SUPER_ADMIN",
  orgId: "org_savewatt",
  orgName: "SaveWatt — AX TECH",
  orgPath: "org_savewatt",
  scope: "PLATFORM",
  isPreview: false,
};

export type IntakeChannel = "PUBLIC_WEB" | "ADMIN";
export type IntakeStatus = "RECEIVED" | "ANALYZED" | "OFFER_READY" | "OFFER_SENT" | "NEEDS_REVIEW" | "FAILED";

export interface IntakeContact {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface IntakeSubmission {
  id: string;
  channel: IntakeChannel;
  status: IntakeStatus;
  contact: IntakeContact;
  clientName: string | null;
  fileName: string;
  mimeType: string;
  attribution: Record<string, string>;
  leadId: string | null;
  dossierId: string | null;
  documentId: string | null;
  extractionId: string | null;
  offerVersionId: string | null;
  issues: IntakeIssue[];
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface IntakeDraft {
  submission: IntakeSubmission;
  extraction: ExtractionResult | null;
  plan: IntakePlan | null;
  planIssues: IntakeIssue[];
  reference: ReferenceTermsRecord | null;
  marginGrid: { min: number; default: number; max: number } | null;
  offerVersion: OfferVersionRecord | null;
}

interface SubmissionRow {
  id: string;
  channel: IntakeChannel;
  status: IntakeStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  client_name: string | null;
  file_r2_key: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  attribution_json: string;
  lead_id: string | null;
  dossier_id: string | null;
  document_id: string | null;
  extraction_id: string | null;
  offer_version_id: string | null;
  issues_json: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

const SEGMENTS: Segment[] = ["C2", "C3", "C4", "C5"];
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_PATH: DossierStatus[] = ["draft", "uploaded", "analyzed"];
const OFFER_CADRANS = ["HPH", "HCH", "HPE", "HCE", "HP", "HC", "BASE"];

export class IntakeManager {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly bucket: R2Bucket = DocumentStorageManager.getBucket(),
    private readonly validation = new DocumentValidationManager(),
  ) {}

  /** Store the bill and open a submission (fast; safe to retry the rest). */
  async receive(
    actor: WorkspaceActor,
    file: File,
    input: { channel: IntakeChannel; contact: IntakeContact; ipHash?: string | null; attribution?: Record<string, string> },
  ): Promise<string> {
    this.assertOperator(actor);
    this.validation.file(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    this.validation.magicBytes(bytes, file.type);
    const id = randomUUID();
    const fileName = this.validation.safeFileName(file.name);
    const r2Key = `intake/${actor.orgId}/${id}/${fileName}`;
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await this.bucket.put(r2Key, bytes, {
      httpMetadata: { contentType: file.type },
      customMetadata: { intakeSubmissionId: id, sha256 },
    });
    await this.database
      .prepare(
        `INSERT INTO intake_submissions (
           id, organization_id, channel, created_by_user_id, contact_name, contact_email,
           contact_phone, company_name, file_r2_key, file_name, mime_type, byte_size, sha256,
           ip_hash, attribution_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        actor.orgId,
        input.channel,
        actor.userId,
        input.contact.name,
        input.contact.email?.toLowerCase() ?? null,
        input.contact.phone,
        input.contact.company,
        r2Key,
        fileName,
        file.type,
        file.size,
        sha256,
        input.ipHash ?? null,
        JSON.stringify(input.attribution ?? {}),
      )
      .run();
    return id;
  }

  /** Read the bill, then create the lead → client/site/dossier from its details. */
  async analyze(actor: WorkspaceActor, submissionId: string): Promise<IntakeSubmission> {
    const row = await this.row(actor, submissionId);
    if (row.dossier_id) return this.map(row);

    let result: ExtractionResult | null = null;
    let extractionError: string | null = null;
    try {
      const object = await this.bucket.get(row.file_r2_key);
      if (!object) throw new Error("INTAKE_FILE_MISSING");
      const data = Buffer.from(await new Response(object.body).arrayBuffer()).toString("base64");
      result = await extractBill({ data, mimeType: row.mime_type });
    } catch (error) {
      extractionError = error instanceof Error ? error.message : String(error);
    }

    const bill = result?.bill ?? null;
    const leads = new LeadRepository(this.database);
    const lead = await leads.create(actor, this.leadInput(row, bill));
    const pdl = this.digits(bill?.pdlOrPrm, 14);
    const existingSite = pdl
      ? await this.database
          .prepare(`SELECT id, client_id FROM sites WHERE pdl = ? LIMIT 1`)
          .bind(pdl)
          .first<{ id: string; client_id: string }>()
      : null;
    const issues: IntakeIssue[] = [];
    let dossierId: string;
    if (existingSite) {
      issues.push("DUPLICATE_PDL");
      dossierId = await this.attachToExistingSite(actor, lead.id, existingSite.client_id, existingSite.id);
    } else {
      const converted = await leads.convert(actor, lead.id);
      dossierId = converted.dossierId;
      if (bill?.siteAddress) {
        await this.database
          .prepare(`UPDATE sites SET address_json = ?, updated_at = unixepoch() WHERE id = ?`)
          .bind(JSON.stringify({ raw: bill.siteAddress }), converted.siteId)
          .run();
      }
    }

    const documents = new DocumentRepository(this.database);
    const document = await documents.createPending(actor, {
      dossierId,
      kind: "BILL",
      r2Key: row.file_r2_key,
      fileName: row.file_name,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      sha256: row.sha256,
    });
    await documents.markAvailable(actor, document);
    await this.advanceDossier(actor, dossierId, "uploaded");

    let extractionId: string | null = null;
    if (result) {
      const extraction = await new ExtractionRepository(this.database).create(actor, {
        documentId: document.id,
        dossierId,
        model: GEMINI_MODEL,
        result,
      });
      extractionId = extraction.id;
      await this.event(actor, dossierId, "EXTRACTION_COMPLETED", "Facture analysée automatiquement", {
        documentId: document.id,
        extractionId,
        confidence: result.overallConfidence,
        warnings: result.warnings,
      });
    } else {
      issues.push("EXTRACTION_FAILED");
    }

    await this.database
      .prepare(
        `UPDATE intake_submissions
         SET status = ?, lead_id = ?, dossier_id = ?, document_id = ?, extraction_id = ?,
             issues_json = ?, error = ?, updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(
        result ? "ANALYZED" : "NEEDS_REVIEW",
        lead.id,
        dossierId,
        document.id,
        extractionId,
        JSON.stringify(issues),
        extractionError,
        row.id,
      )
      .run();
    return this.map(await this.row(actor, row.id));
  }

  async draft(actor: WorkspaceActor, submissionId: string): Promise<IntakeDraft> {
    const submission = this.map(await this.row(actor, submissionId));
    const [extraction, reference, params, grid] = await Promise.all([
      submission.extractionId ? new ExtractionRepository(this.database).find(actor, submission.extractionId) : null,
      new ReferenceTermsRepository(this.database).resolveActive(actor),
      new PricingParameterRepository(this.database).resolveEffective(actor),
      new MarginGridRepository(this.database).resolveEffective(actor),
    ]);
    const result = extraction ? extraction.validated ?? extraction.result : null;
    const planned = result
      ? planIntakeOffer({
          result,
          reference,
          passThrough: { ceeEurMwh: params?.ceeEurMwh ?? 0, capacityEurMwh: params?.capacityEurMwh ?? 0 },
        })
      : null;
    const offerVersion = submission.offerVersionId
      ? await new OfferVersionRepository(this.database).find(actor, submission.offerVersionId)
      : null;
    return {
      submission,
      extraction: result,
      plan: planned?.plan ?? null,
      planIssues: planned?.issues ?? [],
      reference,
      marginGrid: grid
        ? { min: grid.minMarginEurMwh, default: grid.defaultMarginEurMwh, max: grid.maxMarginEurMwh }
        : null,
      offerVersion,
    };
  }

  /**
   * Validate the (optionally corrected) bill, save the Symphonics terms and
   * create an immutable offer version on the submission's dossier.
   */
  async createOffer(actor: WorkspaceActor, submissionId: string, body: unknown): Promise<OfferVersionRecord> {
    const submission = this.map(await this.row(actor, submissionId));
    if (!submission.dossierId || !submission.extractionId) throw new CrmError("OFFER_INPUT_MISSING", 400, "extraction");
    const value = this.object(body);
    const extractions = new ExtractionRepository(this.database);
    const extraction = await extractions.find(actor, submission.extractionId);
    if (!extraction) throw new CrmError("CRM_NOT_FOUND", 404);
    const current = extraction.validated ?? extraction.result;
    const bill = value.bill === undefined ? current.bill : this.patchBill(current.bill, this.object(value.bill));
    await this.syncClientFromBill(actor, submission.dossierId, bill);
    await extractions.saveValidated(actor, extraction.id, { ...current, bill });
    await this.event(actor, submission.dossierId, "EXTRACTION_VALIDATED", "Données de facture validées", {
      extractionId: extraction.id,
      channel: submission.channel,
    });
    await this.advanceDossier(actor, submission.dossierId, "analyzed");

    const offers = this.offers();
    await offers.saveSupplierOffer(actor, submission.dossierId, { ...this.object(value.terms), sourceDocumentId: submission.documentId });
    const version = await offers.createOfferVersion(actor, submission.dossierId, {
      marginEurMwh: value.marginEurMwh ?? null,
      marginOverrideReason: value.marginOverrideReason ?? null,
    });
    await this.update(submission.id, { status: "OFFER_READY", offer_version_id: version.id });
    return version;
  }

  async send(
    actor: WorkspaceActor,
    submissionId: string,
    options: { recipientEmail?: string | null; idempotencyKey: string },
  ) {
    const submission = this.map(await this.row(actor, submissionId));
    if (!submission.offerVersionId) throw new CrmError("OFFER_INPUT_MISSING", 400, "offerVersion");
    const delivery = await new OfferDeliveryManager().send(actor, submission.offerVersionId, {
      recipientEmail: options.recipientEmail ?? submission.contact.email,
      idempotencyKey: options.idempotencyKey,
    });
    if (delivery.state !== "FAILED") await this.update(submission.id, { status: "OFFER_SENT", error: null });
    return delivery;
  }

  /**
   * Public ad flow: read the bill, create the lead, quote from the reference
   * Symphonics sheet and email the offer — or park it for an admin with the
   * reasons, and tell the customer an adviser is finishing it.
   */
  async autoProcess(actor: WorkspaceActor, submissionId: string): Promise<{ status: IntakeStatus; issues: IntakeIssue[] }> {
    let issues: IntakeIssue[] = [];
    try {
      const analyzed = await this.analyze(actor, submissionId);
      issues = [...analyzed.issues];
      const draft = await this.draft(actor, submissionId);
      if (draft.extraction && draft.plan) {
        issues = this.unique([
          ...issues,
          ...autoSendIssues({
            result: draft.extraction,
            reference: draft.reference,
            planIssues: draft.planIssues,
            contactEmail: analyzed.contact.email,
            today: new Date().toISOString().slice(0, 10),
          }),
        ]);
      }
      if (!issues.length && draft.plan) {
        const version = await this.createOffer(actor, submissionId, {
          terms: {
            validUntil: draft.plan.validUntil,
            termYears: draft.plan.termYears,
            ceeEurMwh: draft.plan.ceeEurMwh,
            capacityEurMwh: draft.plan.capacityEurMwh,
            subscriptionEurMonth: draft.plan.subscriptionEurMonth,
            lines: draft.plan.lines,
          },
        });
        if (version.status !== "DRAFT") issues.push("APPROVAL_REQUIRED");
        else if (version.comparison.annualSaving <= 0) issues.push("NO_SAVING");
        else {
          const delivery = await this.send(actor, submissionId, { idempotencyKey: `intake-${submissionId}-${version.id}` });
          if (delivery.state !== "FAILED") return { status: "OFFER_SENT", issues: [] };
          issues.push("PROCESSING_ERROR");
        }
      }
      if (!issues.length) issues.push("PROCESSING_ERROR");
      await this.update(submissionId, { status: "NEEDS_REVIEW", issues_json: JSON.stringify(this.unique(issues)) });
    } catch (error) {
      console.error("INTAKE_AUTO_PROCESS_FAILED", submissionId, error);
      issues = this.unique([...issues, "PROCESSING_ERROR"]);
      await this.update(submissionId, {
        status: "NEEDS_REVIEW",
        issues_json: JSON.stringify(issues),
        error: error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN",
      }).catch(() => undefined);
    }
    await this.acknowledge(actor, submissionId).catch((error) => console.error("INTAKE_ACK_FAILED", error));
    return { status: "NEEDS_REVIEW", issues };
  }

  async list(actor: WorkspaceActor, limit = 100): Promise<IntakeSubmission[]> {
    this.assertOperator(actor);
    const result = await this.database
      .prepare(`${this.selectSql()} WHERE submission.organization_id = ? ORDER BY submission.created_at DESC LIMIT ?`)
      .bind(actor.orgId, limit)
      .all<SubmissionRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async find(actor: WorkspaceActor, submissionId: string): Promise<IntakeSubmission | null> {
    try {
      return this.map(await this.row(actor, submissionId));
    } catch (error) {
      if (error instanceof CrmError && error.status === 404) return null;
      throw error;
    }
  }

  /** Submissions from this IP / email in the window, for public rate limiting. */
  async recentCount(key: { ipHash?: string | null; email?: string | null }, seconds: number): Promise<number> {
    const column = key.ipHash ? "ip_hash" : "contact_email";
    const value = key.ipHash ?? key.email?.toLowerCase();
    if (!value) return 0;
    const row = await this.database
      .prepare(
        `SELECT COUNT(*) AS count FROM intake_submissions
         WHERE ${column} = ? AND channel = 'PUBLIC_WEB' AND created_at > unixepoch() - ?`,
      )
      .bind(value, seconds)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  private async acknowledge(actor: WorkspaceActor, submissionId: string): Promise<void> {
    const submission = this.map(await this.row(actor, submissionId));
    const email = submission.contact.email;
    if (submission.channel !== "PUBLIC_WEB" || !email || !EMAIL_PATTERN.test(email)) return;
    const name = submission.contact.name ? ` ${escapeHtml(submission.contact.name)}` : "";
    await sendEmail(
      {
        to: [email],
        subject: "SaveWatt — Nous avons bien reçu votre facture",
        html: `<div style="font-family:Arial,sans-serif;color:#1d2b25;line-height:1.6;max-width:560px;">
          <p style="font-size:18px;font-weight:700;">Save<span style="color:#118a34;">Watt</span></p>
          <p>Bonjour${name},</p>
          <p>Merci, nous avons bien reçu votre facture d'électricité. Un conseiller SaveWatt finalise votre
          offre personnalisée et vous l'envoie par email sous 24 h ouvrées.</p>
          <p style="color:#5b665f;font-size:12px;">SaveWatt ne vend pas d'énergie : nous vous accompagnons dans le choix de votre contrat.</p>
          <p style="color:#8a938c;font-size:11px;">AX TECH — ECOLED WAVE CONCEPT · 8 rue Marbeau, 75016 Paris</p>
        </div>`,
        text: "Bonjour,\n\nMerci, nous avons bien reçu votre facture d'électricité. Un conseiller SaveWatt finalise votre offre personnalisée et vous l'envoie par email sous 24 h ouvrées.\n\nSaveWatt",
      },
      getCloudflareContext().env.EMAIL as EmailBinding | undefined,
    );
  }

  private leadInput(row: SubmissionRow, bill: ExtractedBill | null): CreateLeadInput {
    const legalName =
      bill?.clientName?.trim() || row.company_name?.trim() || row.contact_name?.trim() || "Prospect web";
    const attribution = JSON.parse(row.attribution_json) as Record<string, string>;
    const source =
      row.channel === "PUBLIC_WEB" ? `web:${attribution.utm_source ?? "direct"}`.slice(0, 120) : "facture-admin";
    const notes = [
      bill?.siteAddress ? `Site : ${bill.siteAddress}` : null,
      bill?.supplier ? `Fournisseur actuel : ${bill.supplier}${bill.offerName ? ` — ${bill.offerName}` : ""}` : null,
      Object.keys(attribution).length ? `Campagne : ${Object.entries(attribution).map(([key, value]) => `${key}=${value}`).join(", ")}` : null,
    ].filter(Boolean);
    return {
      legalName: legalName.slice(0, 180),
      siren: this.digits(bill?.siren, 9),
      contactName: row.contact_name ?? undefined,
      contactEmail: row.contact_email ?? undefined,
      contactPhone: row.contact_phone ?? undefined,
      pdl: this.digits(bill?.pdlOrPrm, 14),
      segment: SEGMENTS.includes(bill?.segment as Segment) ? (bill?.segment as Segment) : undefined,
      source,
      notes: notes.length ? notes.join("\n").slice(0, 4000) : undefined,
    };
  }

  /** The PDL already has a site (sites.pdl is unique): new dossier on that site. */
  private async attachToExistingSite(actor: WorkspaceActor, leadId: string, clientId: string, siteId: string): Promise<string> {
    const dossierId = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO dossiers (id, organization_id, client_id, site_id, owner_user_id, status)
           VALUES (?, ?, ?, ?, ?, 'draft')`,
        )
        .bind(dossierId, actor.orgId, clientId, siteId, actor.userId),
      this.database
        .prepare(
          `UPDATE leads SET status = 'CONVERTED', converted_client_id = ?, converted_site_id = ?,
             converted_dossier_id = ?, converted_at = unixepoch(), version = version + 1, updated_at = unixepoch()
           WHERE id = ?`,
        )
        .bind(clientId, siteId, dossierId, leadId),
      this.database
        .prepare(
          `INSERT INTO dossier_events (
             id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
           ) VALUES (?, ?, ?, ?, 'DOSSIER_CREATED', 'Dossier créé depuis une facture (site déjà connu)', ?)`,
        )
        .bind(randomUUID(), actor.orgId, dossierId, actor.userId, JSON.stringify({ leadId, siteId })),
    ]);
    return dossierId;
  }

  private async syncClientFromBill(actor: WorkspaceActor, dossierId: string, bill: ExtractedBill): Promise<void> {
    const ids = await this.database
      .prepare(`SELECT client_id, site_id FROM dossiers WHERE id = ? AND organization_id = ?`)
      .bind(dossierId, actor.orgId)
      .first<{ client_id: string; site_id: string | null }>();
    if (!ids) throw new CrmError("CRM_NOT_FOUND", 404);
    const statements: D1PreparedStatement[] = [];
    if (bill.clientName?.trim()) {
      statements.push(
        this.database
          .prepare(`UPDATE clients SET legal_name = ?, updated_at = unixepoch() WHERE id = ?`)
          .bind(bill.clientName.trim().slice(0, 180), ids.client_id),
      );
    }
    const siren = this.digits(bill.siren, 9);
    if (siren) {
      statements.push(this.database.prepare(`UPDATE clients SET siren = ? WHERE id = ?`).bind(siren, ids.client_id));
    }
    const pdl = this.digits(bill.pdlOrPrm, 14);
    if (pdl && ids.site_id) {
      const owner = await this.database.prepare(`SELECT id FROM sites WHERE pdl = ?`).bind(pdl).first<{ id: string }>();
      if (owner && owner.id !== ids.site_id) throw new CrmError("CRM_CONFLICT", 409, "pdlOrPrm");
      statements.push(
        this.database.prepare(`UPDATE sites SET pdl = ?, updated_at = unixepoch() WHERE id = ?`).bind(pdl, ids.site_id),
      );
    }
    if (statements.length) await this.database.batch(statements);
  }

  private patchBill(bill: ExtractedBill, patch: Record<string, unknown>): ExtractedBill {
    const text = (value: unknown, field: string, max: number): string | null => {
      if (value === undefined) return (bill as unknown as Record<string, string | null>)[field] ?? null;
      if (value === null || value === "") return null;
      if (typeof value !== "string" || value.length > max) throw new CrmError("CRM_INVALID_INPUT", 400, field);
      return value.trim();
    };
    const number = (value: unknown, field: string, fallback: number | null): number | null => {
      if (value === undefined) return fallback;
      if (value === null || value === "") return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) throw new CrmError("CRM_INVALID_INPUT", 400, field);
      return parsed;
    };
    let consumption: ConsumptionLine[] = bill.consumption;
    if (patch.consumption !== undefined) {
      if (!Array.isArray(patch.consumption) || patch.consumption.length === 0) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "consumption");
      }
      consumption = patch.consumption.map((entry, index) => {
        const line = this.object(entry);
        const previous = bill.consumption[index];
        if (typeof line.cadran !== "string" || !OFFER_CADRANS.includes(line.cadran)) {
          throw new CrmError("CRM_INVALID_INPUT", 400, "cadran");
        }
        return {
          cadran: line.cadran as ConsumptionLine["cadran"],
          volumeKwh: number(line.volumeKwh, "volumeKwh", previous?.volumeKwh ?? null),
          unitPricePrinted: previous?.unitPricePrinted ?? null,
          unitPricePrintedUnit: previous?.unitPricePrintedUnit ?? null,
          unitPriceEurMwh: number(line.unitPriceEurMwh, "unitPriceEurMwh", previous?.unitPriceEurMwh ?? null),
          periodStart: previous?.periodStart ?? null,
          periodEnd: previous?.periodEnd ?? null,
          indexStart: previous?.indexStart ?? null,
          indexEnd: previous?.indexEnd ?? null,
        };
      });
    }
    return {
      ...bill,
      clientName: text(patch.clientName, "clientName", 180),
      siren: text(patch.siren, "siren", 20),
      pdlOrPrm: text(patch.pdlOrPrm, "pdlOrPrm", 20),
      supplier: text(patch.supplier, "supplier", 120),
      siteAddress: text(patch.siteAddress, "siteAddress", 300),
      subscribedPowerKva: number(patch.subscribedPowerKva, "subscribedPowerKva", bill.subscribedPowerKva),
      subscriptionEurPerMonth: number(patch.subscriptionEurPerMonth, "subscriptionEurPerMonth", bill.subscriptionEurPerMonth),
      contractEndDate:
        patch.contractEndDate === undefined
          ? bill.contractEndDate
          : typeof patch.contractEndDate === "string" && DATE_PATTERN.test(patch.contractEndDate)
            ? patch.contractEndDate
            : null,
      consumption,
    };
  }

  private offers(): OfferManager {
    const scopePolicy = new CrmScopePolicy();
    return new OfferManager(
      new SupplierOfferRepository(this.database, scopePolicy),
      new MarginGridRepository(this.database, scopePolicy),
      new PricingParameterRepository(this.database, scopePolicy),
      new OfferVersionRepository(this.database, scopePolicy),
      new DossierRepository(this.database, scopePolicy),
      scopePolicy,
      this.database,
    );
  }

  private async advanceDossier(actor: WorkspaceActor, dossierId: string, target: DossierStatus): Promise<void> {
    const dossiers = new DossierRepository(this.database);
    let dossier = await dossiers.find(actor, dossierId);
    if (!dossier) throw new CrmError("CRM_NOT_FOUND", 404);
    const targetIndex = STATUS_PATH.indexOf(target);
    while (STATUS_PATH.includes(dossier.status) && STATUS_PATH.indexOf(dossier.status) < targetIndex) {
      dossier = await dossiers.updateStatus(actor, dossierId, STATUS_PATH[STATUS_PATH.indexOf(dossier.status) + 1], dossier.version);
    }
  }

  private async event(
    actor: WorkspaceActor,
    dossierId: string,
    eventType: string,
    summary: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO dossier_events (
           id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(randomUUID(), actor.orgId, dossierId, actor.userId, eventType, summary, JSON.stringify(metadata))
      .run();
  }

  private async update(
    submissionId: string,
    fields: Partial<Record<"status" | "offer_version_id" | "issues_json" | "error", string | null>>,
  ): Promise<void> {
    const entries = Object.entries(fields);
    await this.database
      .prepare(
        `UPDATE intake_submissions SET ${entries.map(([column]) => `${column} = ?`).join(", ")}, updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(...entries.map(([, value]) => value), submissionId)
      .run();
  }

  private async row(actor: WorkspaceActor, submissionId: string): Promise<SubmissionRow> {
    this.assertOperator(actor);
    const row = await this.database
      .prepare(`${this.selectSql()} WHERE submission.id = ? AND submission.organization_id = ? LIMIT 1`)
      .bind(submissionId, actor.orgId)
      .first<SubmissionRow>();
    if (!row) throw new CrmError("CRM_NOT_FOUND", 404);
    return row;
  }

  private selectSql(): string {
    return `SELECT submission.*, client.legal_name AS client_name
      FROM intake_submissions submission
      LEFT JOIN dossiers dossier ON dossier.id = submission.dossier_id
      LEFT JOIN clients client ON client.id = dossier.client_id`;
  }

  private map(row: SubmissionRow): IntakeSubmission {
    const issues = (JSON.parse(row.issues_json) as string[]).filter((issue): issue is IntakeIssue =>
      (INTAKE_ISSUES as readonly string[]).includes(issue),
    );
    return {
      id: row.id,
      channel: row.channel,
      status: row.status,
      contact: {
        name: row.contact_name,
        email: row.contact_email,
        phone: row.contact_phone,
        company: row.company_name,
      },
      clientName: row.client_name,
      fileName: row.file_name,
      mimeType: row.mime_type,
      attribution: JSON.parse(row.attribution_json) as Record<string, string>,
      leadId: row.lead_id,
      dossierId: row.dossier_id,
      documentId: row.document_id,
      extractionId: row.extraction_id,
      offerVersionId: row.offer_version_id,
      issues,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private digits(value: string | null | undefined, length: number): string | undefined {
    const digits = (value ?? "").replace(/\s/g, "");
    return new RegExp(`^\\d{${length}}$`).test(digits) ? digits : undefined;
  }

  private unique(issues: IntakeIssue[]): IntakeIssue[] {
    return INTAKE_ISSUES.filter((issue) => issues.includes(issue));
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    return value as Record<string, unknown>;
  }

  /** Quoting from a bill exposes Symphonics buy prices: SaveWatt operators only. */
  private assertOperator(actor: WorkspaceActor): void {
    if (actor.role !== "SUPER_ADMIN") throw new CrmError("CRM_FORBIDDEN", 403);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}
