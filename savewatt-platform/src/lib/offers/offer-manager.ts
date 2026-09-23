import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { compare, proposedPrice } from "@/lib/compare";
import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import type { Cadran, CurrentContract, Proposal } from "@/lib/types";
import type { ExtractionResult } from "@/lib/extraction/schema";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { MarginGridRepository } from "./margin-grid-repository";
import { OfferVersionRepository } from "./offer-version-repository";
import type { ClientPriceLine, OfferVersionRecord, OfferVersionStatus, SaveSupplierOfferInput, SupplierOfferRecord } from "./offer-types";
import { SupplierOfferRepository } from "./supplier-offer-repository";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class OfferManager {
  constructor(
    private readonly supplierOffers = new SupplierOfferRepository(),
    private readonly marginGrids = new MarginGridRepository(),
    private readonly offerVersions = new OfferVersionRepository(),
    private readonly dossiers = new DossierRepository(),
    private readonly scopePolicy = new CrmScopePolicy(),
    private readonly database: D1Database = DatabaseManager.getDatabase(),
  ) {}

  getSupplierOffer(actor: WorkspaceActor, dossierId: string): Promise<SupplierOfferRecord | null> {
    return this.supplierOffers.findByDossier(actor, dossierId);
  }

  async saveSupplierOffer(
    actor: WorkspaceActor,
    dossierId: string,
    body: unknown,
  ): Promise<SupplierOfferRecord> {
    const input = this.validateSupplierOffer(body);
    const saved = await this.supplierOffers.upsert(actor, dossierId, input);
    await this.recordDossierEvent(actor, dossierId, "SUPPLIER_OFFER_SAVED", {
      supplierOfferId: saved.id,
      lines: saved.lines.length,
    });
    return saved;
  }

  async resolveMarginGrid(actor: WorkspaceActor) {
    return this.marginGrids.resolveEffective(actor);
  }

  /**
   * Create an immutable offer version from the dossier's validated extraction,
   * supplier offer, and the effective margin grid.
   *
   * Margin rules (server-enforced):
   * - default margin → DRAFT
   * - within [min, max] but ≠ default → requires a reason → DRAFT
   * - outside [min, max] → APPROVAL_REQUIRED (cannot be sent until approved)
   */
  async createOfferVersion(
    actor: WorkspaceActor,
    dossierId: string,
    body: unknown,
  ): Promise<OfferVersionRecord> {
    const request = this.validateCreateVersion(body);
    const extraction = await this.latestValidatedExtraction(actor, dossierId);
    const supplierOffer = await this.supplierOffers.findByDossier(actor, dossierId);
    if (!extraction) throw new CrmError("OFFER_INPUT_MISSING", 400, "extraction");
    if (!supplierOffer) throw new CrmError("OFFER_INPUT_MISSING", 400, "supplierOffer");
    const grid = await this.marginGrids.resolveEffective(actor);
    if (!grid) throw new CrmError("OFFER_MARGIN_GRID_MISSING", 400, "marginGrid");

    const margin = request.marginEurMwh ?? grid.defaultMarginEurMwh;
    let status: OfferVersionStatus = "DRAFT";
    if (margin < grid.minMarginEurMwh || margin > grid.maxMarginEurMwh) {
      status = "APPROVAL_REQUIRED";
    }
    const reason = request.marginOverrideReason?.trim() || null;

    const currentContract = this.toCurrentContract(extraction);
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
    const comparison = compare(currentContract, proposal);
    const clientPriceLines: ClientPriceLine[] = supplierOffer.lines.map((line) => ({
      cadran: line.cadran,
      priceEurMwh: proposedPrice(proposal, line.electronEurMwh),
    }));

    const created = await this.offerVersions.create(
      actor,
      dossierId,
      {
        currentContract,
        supplierOffer: proposal,
        marginEurMwh: margin,
        marginOverrideReason: reason,
        comparison,
        clientPriceLines,
      },
      status,
    );
    await this.recordDossierEvent(actor, dossierId, "OFFER_VERSION_CREATED", {
      offerVersionId: created.id,
      versionNo: created.versionNo,
      status: created.status,
      sha256: created.sha256,
    });
    const dossier = await this.dossiers.find(actor, dossierId);
    if (dossier?.status === "analyzed") {
      try {
        await this.dossiers.updateStatus(actor, dossierId, "proposalReady", dossier.version);
      } catch {
        // Status may already be advanced; the offer version remains authoritative.
      }
    }
    return created;
  }

  listOfferVersions(actor: WorkspaceActor, dossierId: string): Promise<OfferVersionRecord[]> {
    return this.offerVersions.listForDossier(actor, dossierId);
  }

  async approveOfferVersion(actor: WorkspaceActor, offerVersionId: string): Promise<OfferVersionRecord> {
    if (!["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role)) {
      throw new CrmError("CRM_FORBIDDEN", 403);
    }
    const version = await this.offerVersions.find(actor, offerVersionId);
    if (!version) throw new CrmError("CRM_NOT_FOUND", 404);
    if (version.status !== "APPROVAL_REQUIRED" && version.status !== "DRAFT") {
      throw new CrmError("CRM_CONFLICT", 409, "status");
    }
    const updated = await this.offerVersions.updateStatus(actor, offerVersionId, "APPROVED");
    await this.recordDossierEvent(actor, version.dossierId, "OFFER_VERSION_APPROVED", {
      offerVersionId,
      versionNo: version.versionNo,
    });
    return updated;
  }

  private validateSupplierOffer(body: unknown): SaveSupplierOfferInput {
    const value = this.object(body);
    const validUntil = this.optionalDate(value.validUntil, "validUntil");
    const termYears = this.number(value.termYears, "termYears", { min: 1, max: 6, integer: true });
    const ceeEurMwh = this.number(value.ceeEurMwh, "ceeEurMwh", { min: 0 });
    const capacityEurMwh = this.number(value.capacityEurMwh, "capacityEurMwh", { min: 0 });
    const subscriptionEurMonth = this.number(value.subscriptionEurMonth, "subscriptionEurMonth", { min: 0 });
    if (!Array.isArray(value.lines) || value.lines.length === 0) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "lines");
    }
    const lines = value.lines.map((line) => {
      const entry = this.object(line);
      return {
        cadran: String(entry.cadran ?? "") as Cadran,
        electronEurMwh: this.number(entry.electronEurMwh, "electronEurMwh", { min: 0 }),
        annualVolumeMwh: this.number(entry.annualVolumeMwh, "annualVolumeMwh", { min: 0 }),
      };
    });
    return {
      validUntil,
      termYears,
      ceeEurMwh,
      capacityEurMwh,
      subscriptionEurMonth,
      sourceDocumentId: typeof value.sourceDocumentId === "string" ? value.sourceDocumentId : null,
      lines,
    };
  }

  private validateCreateVersion(body: unknown): {
    marginEurMwh: number | null;
    marginOverrideReason: string | null;
  } {
    const value = this.object(body);
    const marginEurMwh =
      value.marginEurMwh === undefined || value.marginEurMwh === null
        ? null
        : this.number(value.marginEurMwh, "marginEurMwh", { min: 0 });
    const marginOverrideReason =
      value.marginOverrideReason === undefined || value.marginOverrideReason === null
        ? null
        : this.text(value.marginOverrideReason, "marginOverrideReason", 500);
    return { marginEurMwh, marginOverrideReason };
  }

  private async latestValidatedExtraction(actor: WorkspaceActor, dossierId: string) {
    this.scopePolicy.assertCanRead(actor);
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(
        `SELECT extraction.validated_json, extraction.field_confidence_json, extraction.overall_confidence, extraction.warnings_json
         FROM extractions extraction
         JOIN dossiers dossier ON dossier.id = extraction.dossier_id
         JOIN organizations resource_org ON resource_org.id = extraction.organization_id
         WHERE extraction.dossier_id = ? AND extraction.status = 'VALIDATED' AND ${scope.sql}
         ORDER BY extraction.validated_at DESC LIMIT 1`,
      )
      .bind(dossierId, ...scope.bindings)
      .first<{
        validated_json: string;
        field_confidence_json: string;
        overall_confidence: number | null;
        warnings_json: string;
      }>();
    if (!row) return null;
    return {
      bill: JSON.parse(row.validated_json) as ExtractionResult["bill"],
      fieldConfidence: JSON.parse(row.field_confidence_json) as ExtractionResult["fieldConfidence"],
      overallConfidence: row.overall_confidence ?? 0,
      warnings: JSON.parse(row.warnings_json) as string[],
    };
  }

  private toCurrentContract(extraction: ExtractionResult): CurrentContract {
    const bill = extraction.bill;
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

  private async recordDossierEvent(
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
      .bind(
        randomUUID(),
        actor.orgId,
        dossierId,
        actor.userId,
        eventType,
        eventType,
        JSON.stringify(metadata),
      )
      .run();
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    }
    return value as Record<string, unknown>;
  }

  private text(value: unknown, field: string, max: number): string {
    if (typeof value !== "string" || !value.trim() || value.length > max) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    return value.trim();
  }

  private optionalDate(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    return value;
  }

  private number(
    value: unknown,
    field: string,
    bounds: { min?: number; max?: number; integer?: boolean },
  ): number {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) throw new CrmError("CRM_INVALID_INPUT", 400, field);
    if (bounds.integer && !Number.isInteger(parsed)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    if (bounds.min !== undefined && parsed < bounds.min) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    if (bounds.max !== undefined && parsed > bounds.max) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    return parsed;
  }
}
