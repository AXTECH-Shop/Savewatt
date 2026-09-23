import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import { hashOfferSnapshot } from "./offer-snapshot";
import type {
  ClientPriceLine,
  OfferVersionRecord,
  OfferVersionStatus,
} from "./offer-types";
import type { ComparisonResult } from "@/lib/compare";
import type { CurrentContract, Proposal } from "@/lib/types";

interface OfferVersionRow {
  id: string;
  organization_id: string;
  dossier_id: string;
  version_no: number;
  status: OfferVersionStatus;
  current_contract_json: string;
  supplier_offer_json: string;
  margin_eur_mwh: number;
  margin_override_reason: string | null;
  comparison_json: string;
  client_price_lines_json: string;
  sha256: string;
  pdf_r2_key: string | null;
  pdf_sha256: string | null;
  created_at: number;
}

export interface OfferVersionSnapshot {
  currentContract: CurrentContract;
  supplierOffer: Proposal;
  marginEurMwh: number;
  marginOverrideReason: string | null;
  comparison: ComparisonResult;
  clientPriceLines: ClientPriceLine[];
}

export class OfferVersionRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  async listForDossier(actor: WorkspaceActor, dossierId: string): Promise<OfferVersionRecord[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const result = await this.database
      .prepare(
        `SELECT offer_version.* FROM offer_versions offer_version
         JOIN dossiers dossier ON dossier.id = offer_version.dossier_id
         JOIN organizations resource_org ON resource_org.id = offer_version.organization_id
         WHERE offer_version.dossier_id = ? AND ${scope.sql}
         ORDER BY offer_version.version_no DESC`,
      )
      .bind(dossierId, ...scope.bindings)
      .all<OfferVersionRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async find(actor: WorkspaceActor, offerVersionId: string): Promise<OfferVersionRecord | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(
        `SELECT offer_version.* FROM offer_versions offer_version
         JOIN dossiers dossier ON dossier.id = offer_version.dossier_id
         JOIN organizations resource_org ON resource_org.id = offer_version.organization_id
         WHERE offer_version.id = ? AND ${scope.sql} LIMIT 1`,
      )
      .bind(offerVersionId, ...scope.bindings)
      .first<OfferVersionRow>();
    return row ? this.map(row) : null;
  }

  /** Immutable: a new version row is created; sent rows are never mutated. */
  async create(
    actor: WorkspaceActor,
    dossierId: string,
    snapshot: OfferVersionSnapshot,
    status: OfferVersionStatus,
  ): Promise<OfferVersionRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const versionNo = await this.nextVersionNo(dossierId);
    const id = randomUUID();
    const sha256 = this.hashSnapshot({ ...snapshot, dossierId, versionNo });
    try {
      await this.database
        .prepare(
          `INSERT INTO offer_versions (
             id, organization_id, dossier_id, version_no, status,
             current_contract_json, supplier_offer_json, margin_eur_mwh,
             margin_override_reason, comparison_json, client_price_lines_json,
             sha256, created_by_user_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          actor.orgId,
          dossierId,
          versionNo,
          status,
          JSON.stringify(snapshot.currentContract),
          JSON.stringify(snapshot.supplierOffer),
          snapshot.marginEurMwh,
          snapshot.marginOverrideReason,
          JSON.stringify(snapshot.comparison),
          JSON.stringify(snapshot.clientPriceLines),
          sha256,
          actor.userId,
        )
        .run();
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) {
        throw new CrmError("CRM_CONFLICT", 409, "versionNo");
      }
      throw error;
    }
    const created = await this.find(actor, id);
    if (!created) throw new CrmError("CRM_NOT_FOUND", 404);
    return created;
  }

  async updateStatus(
    actor: WorkspaceActor,
    offerVersionId: string,
    status: OfferVersionStatus,
  ): Promise<OfferVersionRecord> {
    this.scopePolicy.assertCanWrite(actor);
    await this.database
      .prepare(`UPDATE offer_versions SET status = ? WHERE id = ?`)
      .bind(status, offerVersionId)
      .run();
    const updated = await this.find(actor, offerVersionId);
    if (!updated) throw new CrmError("CRM_NOT_FOUND", 404);
    return updated;
  }

  hashSnapshot(snapshot: OfferVersionSnapshot & { dossierId: string; versionNo: number }): string {
    return hashOfferSnapshot(snapshot);
  }

  private async nextVersionNo(dossierId: string): Promise<number> {
    const row = await this.database
      .prepare(`SELECT COALESCE(MAX(version_no), 0) + 1 AS next FROM offer_versions WHERE dossier_id = ?`)
      .bind(dossierId)
      .first<{ next: number }>();
    return row?.next ?? 1;
  }

  private map(row: OfferVersionRow): OfferVersionRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      dossierId: row.dossier_id,
      versionNo: row.version_no,
      status: row.status,
      currentContract: JSON.parse(row.current_contract_json) as CurrentContract,
      supplierOffer: JSON.parse(row.supplier_offer_json) as Proposal,
      marginEurMwh: row.margin_eur_mwh,
      marginOverrideReason: row.margin_override_reason,
      comparison: JSON.parse(row.comparison_json) as ComparisonResult,
      clientPriceLines: JSON.parse(row.client_price_lines_json) as ClientPriceLine[],
      sha256: row.sha256,
      pdfR2Key: row.pdf_r2_key,
      pdfSha256: row.pdf_sha256,
      createdAt: row.created_at,
    };
  }
}
