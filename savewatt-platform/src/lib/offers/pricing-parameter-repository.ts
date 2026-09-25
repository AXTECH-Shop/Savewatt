import "server-only";

import { randomUUID } from "node:crypto";
import { canManageNetwork, type WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import type { ScopePredicate } from "@/lib/crm/crm-scope-policy";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import type { TurpeFixedRates, TurpeVariableRates } from "./estimate";
import type { PricingParameterRecord } from "./offer-types";

interface PricingParameterRow {
  id: string;
  organization_id: string;
  version: number;
  status: PricingParameterRecord["status"];
  cee_eur_mwh: number;
  capacity_eur_mwh: number;
  accise_eur_mwh: number;
  cta_rate: number;
  tva_rate: number;
  turpe_fixed_json: string;
  turpe_variable_json: string;
  effective_from: string;
  effective_to: string | null;
  created_at: number;
  created_by_name?: string | null;
}

export type SavePricingParametersInput = Omit<
  PricingParameterRecord,
  "id" | "version" | "status" | "createdAt"
>;

export class PricingParameterRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  /** Effective ACTIVE parameter set for the organization on the given ISO date (today by default). */
  async resolveEffective(
    actor: WorkspaceActor,
    onDate?: string,
  ): Promise<PricingParameterRecord | null> {
    const scope = this.paramScope(actor);
    const date = onDate ?? new Date().toISOString().slice(0, 10);
    const row = await this.database
      .prepare(
        `SELECT params.* FROM pricing_parameters params
         JOIN organizations resource_org ON resource_org.id = params.organization_id
         WHERE params.organization_id = ? AND ${scope.sql}
           AND params.status = 'ACTIVE'
           AND params.effective_from <= ? AND (params.effective_to IS NULL OR params.effective_to >= ?)
         ORDER BY params.version DESC LIMIT 1`,
      )
      .bind(actor.orgId, ...scope.bindings, date, date)
      .first<PricingParameterRow>();
    if (row) return this.map(row);
    if (actor.role === "SUPER_ADMIN") return null;
    // Pass-through rates are operator-owned: network orgs without their own
    // parameter set fall back to the operator organization's effective set.
    const fallback = await this.database
      .prepare(
        `SELECT params.* FROM pricing_parameters params
         JOIN organizations resource_org ON resource_org.id = params.organization_id
         WHERE resource_org.kind = 'OPERATOR'
           AND params.status = 'ACTIVE'
           AND params.effective_from <= ? AND (params.effective_to IS NULL OR params.effective_to >= ?)
         ORDER BY params.version DESC LIMIT 1`,
      )
      .bind(date, date)
      .first<PricingParameterRow>();
    return fallback ? this.map(fallback) : null;
  }

  async list(actor: WorkspaceActor): Promise<PricingParameterRecord[]> {
    const scope = this.paramScope(actor);
    const result = await this.database
      .prepare(
        `SELECT params.*, author.display_name AS created_by_name FROM pricing_parameters params
         JOIN organizations resource_org ON resource_org.id = params.organization_id
         LEFT JOIN users author ON author.id = params.created_by_user_id
         WHERE params.organization_id = ? AND ${scope.sql}
         ORDER BY params.version DESC`,
      )
      .bind(actor.orgId, ...scope.bindings)
      .all<PricingParameterRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  /** New ACTIVE version; the previous ACTIVE version for the org is superseded. */
  async create(
    actor: WorkspaceActor,
    input: SavePricingParametersInput,
  ): Promise<PricingParameterRecord> {
    if (!canManageNetwork(actor.role)) throw new CrmError("CRM_FORBIDDEN", 403);
    const nextVersion = await this.nextVersion(actor.orgId);
    const id = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE pricing_parameters SET status = 'SUPERSEDED'
           WHERE organization_id = ? AND status = 'ACTIVE'`,
        )
        .bind(actor.orgId),
      this.database
        .prepare(
          `INSERT INTO pricing_parameters (
             id, organization_id, version, status,
             cee_eur_mwh, capacity_eur_mwh, accise_eur_mwh, cta_rate, tva_rate,
             turpe_fixed_json, turpe_variable_json,
             effective_from, effective_to, created_by_user_id
           ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          actor.orgId,
          nextVersion,
          input.ceeEurMwh,
          input.capacityEurMwh,
          input.acciseEurMwh,
          input.ctaRate,
          input.tvaRate,
          JSON.stringify(input.turpeFixed),
          JSON.stringify(input.turpeVariable),
          input.effectiveFrom,
          input.effectiveTo ?? null,
          actor.userId,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) VALUES (?, ?, ?, 'PRICING_PARAMETERS_CREATED', 'PRICING_PARAMETERS', ?, ?)`,
        )
        .bind(
          randomUUID(),
          actor.orgId,
          actor.userId,
          id,
          JSON.stringify({ version: nextVersion, effectiveFrom: input.effectiveFrom }),
        ),
    ]);
    const scope = this.paramScope(actor);
    const row = await this.database
      .prepare(
        `SELECT params.* FROM pricing_parameters params
         JOIN organizations resource_org ON resource_org.id = params.organization_id
         WHERE params.id = ? AND ${scope.sql} LIMIT 1`,
      )
      .bind(id, ...scope.bindings)
      .first<PricingParameterRow>();
    if (!row) throw new Error("PRICING_PARAMETERS_NOT_FOUND_AFTER_CREATE");
    return this.map(row);
  }

  /** Same org-level scoping as margin grids (see MarginGridRepository). */
  private paramScope(actor: WorkspaceActor): ScopePredicate {
    this.scopePolicy.assertCanRead(actor);
    if (actor.role === "SUPER_ADMIN") return { sql: "1 = 1", bindings: [] };
    if (["MASTER_ADMIN", "MASTER_BACKOFFICE", "SUB_REGIE_ADMIN"].includes(actor.role)) {
      return {
        sql: "(resource_org.path = ? OR resource_org.path LIKE ?)",
        bindings: [actor.orgPath, `${actor.orgPath}.%`],
      };
    }
    return { sql: "resource_org.id = ?", bindings: [actor.orgId] };
  }

  private async nextVersion(organizationId: string): Promise<number> {
    const row = await this.database
      .prepare(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM pricing_parameters WHERE organization_id = ?`,
      )
      .bind(organizationId)
      .first<{ next: number }>();
    return row?.next ?? 1;
  }

  private map(row: PricingParameterRow): PricingParameterRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      version: row.version,
      status: row.status,
      ceeEurMwh: row.cee_eur_mwh,
      capacityEurMwh: row.capacity_eur_mwh,
      acciseEurMwh: row.accise_eur_mwh,
      ctaRate: row.cta_rate,
      tvaRate: row.tva_rate,
      turpeFixed: JSON.parse(row.turpe_fixed_json) as TurpeFixedRates,
      turpeVariable: JSON.parse(row.turpe_variable_json) as TurpeVariableRates,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      createdAt: row.created_at,
      ...(row.created_by_name !== undefined ? { createdBy: row.created_by_name } : {}),
    };
  }
}
