import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { canSeeInternalPricing } from "@/lib/offers/offer-visibility";
import type { SeasonalCadran } from "@/lib/offers/estimate";
import { SEASONAL_CADRANS, type ReferenceTerms } from "./intake-plan";

export interface ReferenceTermsRecord extends ReferenceTerms {
  id: string;
  organizationId: string;
  version: number;
  createdAt: number;
}

interface ReferenceTermsRow {
  id: string;
  organization_id: string;
  version: number;
  term_years: number;
  subscription_eur_month: number;
  valid_until: string;
  prices_json: string;
  auto_send: number;
  min_confidence: number;
  created_at: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Operator-owned standing Symphonics price sheet (électron buy prices: internal only). */
export class ReferenceTermsRepository {
  constructor(private readonly database: D1Database = DatabaseManager.getDatabase()) {}

  async resolveActive(actor: WorkspaceActor): Promise<ReferenceTermsRecord | null> {
    this.assertOperator(actor);
    const row = await this.database
      .prepare(
        `SELECT * FROM reference_supplier_terms
         WHERE organization_id = ? AND status = 'ACTIVE'
         ORDER BY version DESC LIMIT 1`,
      )
      .bind(actor.orgId)
      .first<ReferenceTermsRow>();
    return row ? this.map(row) : null;
  }

  /** Most recent Symphonics quote entered on a dossier, to prefill the first sheet. */
  async latestDossierQuote(actor: WorkspaceActor): Promise<Omit<ReferenceTerms, "autoSend" | "minConfidence"> | null> {
    this.assertOperator(actor);
    const offer = await this.database
      .prepare(
        `SELECT id, term_years, subscription_eur_month, valid_until FROM supplier_offers
         WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 1`,
      )
      .bind(actor.orgId)
      .first<{ id: string; term_years: number; subscription_eur_month: number; valid_until: string | null }>();
    if (!offer) return null;
    const lines = await this.database
      .prepare(`SELECT cadran, electron_eur_mwh FROM supplier_offer_lines WHERE offer_id = ?`)
      .bind(offer.id)
      .all<{ cadran: string; electron_eur_mwh: number }>();
    const prices: Partial<Record<SeasonalCadran, number>> = {};
    for (const line of lines.results ?? []) {
      if ((SEASONAL_CADRANS as string[]).includes(line.cadran)) prices[line.cadran as SeasonalCadran] = line.electron_eur_mwh;
    }
    return {
      termYears: offer.term_years,
      subscriptionEurMonth: offer.subscription_eur_month,
      validUntil: offer.valid_until ?? "",
      prices,
    };
  }

  async create(actor: WorkspaceActor, body: unknown): Promise<ReferenceTermsRecord> {
    this.assertOperator(actor);
    const input = this.validate(body);
    const next = await this.database
      .prepare(`SELECT COALESCE(MAX(version), 0) + 1 AS next FROM reference_supplier_terms WHERE organization_id = ?`)
      .bind(actor.orgId)
      .first<{ next: number }>();
    const version = next?.next ?? 1;
    const id = randomUUID();
    await this.database.batch([
      this.database
        .prepare(`UPDATE reference_supplier_terms SET status = 'SUPERSEDED' WHERE organization_id = ? AND status = 'ACTIVE'`)
        .bind(actor.orgId),
      this.database
        .prepare(
          `INSERT INTO reference_supplier_terms (
             id, organization_id, version, term_years, subscription_eur_month, valid_until,
             prices_json, auto_send, min_confidence, created_by_user_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          actor.orgId,
          version,
          input.termYears,
          input.subscriptionEurMonth,
          input.validUntil,
          JSON.stringify(input.prices),
          input.autoSend ? 1 : 0,
          input.minConfidence,
          actor.userId,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) VALUES (?, ?, ?, 'REFERENCE_TERMS_CREATED', 'REFERENCE_TERMS', ?, ?)`,
        )
        .bind(randomUUID(), actor.orgId, actor.userId, id, JSON.stringify({ version, autoSend: input.autoSend })),
    ]);
    const created = await this.resolveActive(actor);
    if (!created) throw new Error("REFERENCE_TERMS_NOT_FOUND_AFTER_CREATE");
    return created;
  }

  private validate(body: unknown): ReferenceTerms {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    const value = body as Record<string, unknown>;
    const number = (raw: unknown, field: string, min: number, max: number) => {
      const parsed = typeof raw === "number" ? raw : Number(raw);
      if (raw === null || raw === "" || !Number.isFinite(parsed) || parsed < min || parsed > max) {
        throw new CrmError("CRM_INVALID_INPUT", 400, field);
      }
      return parsed;
    };
    const termYears = number(value.termYears, "termYears", 1, 6);
    if (!Number.isInteger(termYears)) throw new CrmError("CRM_INVALID_INPUT", 400, "termYears");
    if (typeof value.validUntil !== "string" || !DATE_PATTERN.test(value.validUntil)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "validUntil");
    }
    const rawPrices = (value.prices ?? {}) as Record<string, unknown>;
    const prices: Partial<Record<SeasonalCadran, number>> = {};
    for (const cadran of SEASONAL_CADRANS) {
      prices[cadran] = number(rawPrices[cadran], `prices.${cadran}`, 0, 2000);
    }
    return {
      termYears,
      subscriptionEurMonth: number(value.subscriptionEurMonth, "subscriptionEurMonth", 0, 10_000),
      validUntil: value.validUntil,
      prices,
      autoSend: value.autoSend === true,
      minConfidence: number(value.minConfidence ?? 0.8, "minConfidence", 0.5, 1),
    };
  }

  private assertOperator(actor: WorkspaceActor): void {
    if (!canSeeInternalPricing(actor.role)) throw new CrmError("CRM_FORBIDDEN", 403);
  }

  private map(row: ReferenceTermsRow): ReferenceTermsRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      version: row.version,
      termYears: row.term_years,
      subscriptionEurMonth: row.subscription_eur_month,
      validUntil: row.valid_until,
      prices: JSON.parse(row.prices_json) as Partial<Record<SeasonalCadran, number>>,
      autoSend: row.auto_send === 1,
      minConfidence: row.min_confidence,
      createdAt: row.created_at,
    };
  }
}
