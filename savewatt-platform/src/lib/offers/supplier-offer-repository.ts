import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import type { ProposedLine } from "@/lib/types";
import type { SupplierOfferRecord, SaveSupplierOfferInput } from "./offer-types";

interface SupplierOfferRow {
  id: string;
  organization_id: string;
  dossier_id: string;
  valid_until: string | null;
  term_years: number;
  cee_eur_mwh: number;
  capacity_eur_mwh: number;
  subscription_eur_month: number;
  source_document_id: string | null;
  created_at: number;
  updated_at: number;
}

interface SupplierOfferLineRow {
  id: string;
  offer_id: string;
  cadran: string;
  electron_eur_mwh: number;
  annual_volume_mwh: number;
}

export class SupplierOfferRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  async findByDossier(actor: WorkspaceActor, dossierId: string): Promise<SupplierOfferRecord | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(
        `SELECT offer.* FROM supplier_offers offer
         JOIN dossiers dossier ON dossier.id = offer.dossier_id
         JOIN organizations resource_org ON resource_org.id = offer.organization_id
         WHERE offer.dossier_id = ? AND ${scope.sql}
         ORDER BY offer.updated_at DESC LIMIT 1`,
      )
      .bind(dossierId, ...scope.bindings)
      .first<SupplierOfferRow>();
    if (!row) return null;
    const lines = await this.listLines(row.id);
    return this.map(row, lines);
  }

  /** One active offer per dossier: replaces lines and updates the header. */
  async upsert(actor: WorkspaceActor, dossierId: string, input: SaveSupplierOfferInput): Promise<SupplierOfferRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const existing = await this.database
      .prepare(
        `SELECT offer.id FROM supplier_offers offer
         JOIN dossiers dossier ON dossier.id = offer.dossier_id
         JOIN organizations resource_org ON resource_org.id = offer.organization_id
         WHERE offer.dossier_id = ? AND ${scope.sql}
         ORDER BY offer.updated_at DESC LIMIT 1`,
      )
      .bind(dossierId, ...scope.bindings)
      .first<{ id: string }>();

    const offerId = existing?.id ?? randomUUID();
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO supplier_offers (
             id, organization_id, dossier_id, valid_until, term_years,
             cee_eur_mwh, capacity_eur_mwh, subscription_eur_month, source_document_id,
             created_by_user_id, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
           ON CONFLICT(id) DO UPDATE SET
             valid_until = excluded.valid_until,
             term_years = excluded.term_years,
             cee_eur_mwh = excluded.cee_eur_mwh,
             capacity_eur_mwh = excluded.capacity_eur_mwh,
             subscription_eur_month = excluded.subscription_eur_month,
             source_document_id = excluded.source_document_id,
             updated_at = unixepoch()`,
        )
        .bind(
          offerId,
          actor.orgId,
          dossierId,
          input.validUntil ?? null,
          input.termYears,
          input.ceeEurMwh,
          input.capacityEurMwh,
          input.subscriptionEurMonth,
          input.sourceDocumentId ?? null,
          actor.userId,
        ),
    ];
    if (existing) {
      statements.push(
        this.database.prepare(`DELETE FROM supplier_offer_lines WHERE offer_id = ?`).bind(offerId),
      );
    }
    for (const line of input.lines) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO supplier_offer_lines (id, offer_id, cadran, electron_eur_mwh, annual_volume_mwh)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(randomUUID(), offerId, line.cadran, line.electronEurMwh, line.annualVolumeMwh),
      );
    }
    await this.database.batch(statements);
    const saved = await this.findByDossier(actor, dossierId);
    if (!saved) throw new CrmError("CRM_NOT_FOUND", 404);
    return saved;
  }

  private async listLines(offerId: string): Promise<ProposedLine[]> {
    const result = await this.database
      .prepare(
        `SELECT cadran, electron_eur_mwh, annual_volume_mwh
         FROM supplier_offer_lines WHERE offer_id = ? ORDER BY rowid`,
      )
      .bind(offerId)
      .all<Pick<SupplierOfferLineRow, "cadran" | "electron_eur_mwh" | "annual_volume_mwh">>();
    return (result.results ?? []).map((row) => ({
      cadran: row.cadran as ProposedLine["cadran"],
      electronEurMwh: row.electron_eur_mwh,
      annualVolumeMwh: row.annual_volume_mwh,
    }));
  }

  private map(row: SupplierOfferRow, lines: ProposedLine[]): SupplierOfferRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      dossierId: row.dossier_id,
      validUntil: row.valid_until,
      termYears: row.term_years,
      ceeEurMwh: row.cee_eur_mwh,
      capacityEurMwh: row.capacity_eur_mwh,
      subscriptionEurMonth: row.subscription_eur_month,
      sourceDocumentId: row.source_document_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lines,
    };
  }
}
