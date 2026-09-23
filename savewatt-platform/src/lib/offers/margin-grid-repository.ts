import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import type { ScopePredicate } from "@/lib/crm/crm-scope-policy";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import type { MarginGridRecord } from "./offer-types";

interface MarginGridRow {
  id: string;
  organization_id: string;
  version: number;
  status: MarginGridRecord["status"];
  min_margin_eur_mwh: number;
  default_margin_eur_mwh: number;
  max_margin_eur_mwh: number;
  effective_from: string;
  effective_to: string | null;
  created_at: number;
}

export class MarginGridRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  /** Effective ACTIVE grid for the organization on the given ISO date (today by default). */
  async resolveEffective(actor: WorkspaceActor, onDate?: string): Promise<MarginGridRecord | null> {
    const scope = this.gridScope(actor);
    const date = onDate ?? new Date().toISOString().slice(0, 10);
    const row = await this.database
      .prepare(
        `SELECT grid.* FROM margin_grids grid
         JOIN organizations resource_org ON resource_org.id = grid.organization_id
         WHERE grid.organization_id = ? AND ${scope.sql}
           AND grid.status = 'ACTIVE'
           AND grid.effective_from <= ? AND (grid.effective_to IS NULL OR grid.effective_to >= ?)
         ORDER BY grid.version DESC LIMIT 1`,
      )
      .bind(actor.orgId, ...scope.bindings, date, date)
      .first<MarginGridRow>();
    return row ? this.map(row) : null;
  }

  async list(actor: WorkspaceActor): Promise<MarginGridRecord[]> {
    const scope = this.gridScope(actor);
    const result = await this.database
      .prepare(
        `SELECT grid.* FROM margin_grids grid
         JOIN organizations resource_org ON resource_org.id = grid.organization_id
         WHERE grid.organization_id = ? AND ${scope.sql}
         ORDER BY grid.version DESC`,
      )
      .bind(actor.orgId, ...scope.bindings)
      .all<MarginGridRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async create(
    actor: WorkspaceActor,
    input: Omit<MarginGridRecord, "id" | "version" | "status" | "createdAt">,
  ): Promise<MarginGridRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const nextVersion = await this.nextVersion(actor.orgId);
    const gridId = randomUUID();
    await this.database
      .prepare(
        `INSERT INTO margin_grids (
           id, organization_id, version, status,
           min_margin_eur_mwh, default_margin_eur_mwh, max_margin_eur_mwh,
           effective_from, effective_to, created_by_user_id
         ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        gridId,
        actor.orgId,
        nextVersion,
        input.minMarginEurMwh,
        input.defaultMarginEurMwh,
        input.maxMarginEurMwh,
        input.effectiveFrom,
        input.effectiveTo ?? null,
        actor.userId,
      )
      .run();
    const scope = this.gridScope(actor);
    const row = await this.database
      .prepare(
        `SELECT grid.* FROM margin_grids grid
         JOIN organizations resource_org ON resource_org.id = grid.organization_id
         WHERE grid.id = ? AND ${scope.sql} LIMIT 1`,
      )
      .bind(gridId, ...scope.bindings)
      .first<MarginGridRow>();
    if (!row) throw new Error("MARGIN_GRID_NOT_FOUND_AFTER_CREATE");
    return this.map(row);
  }

  /**
   * Organization-level resource: any member of the org (or ancestor branch)
   * may read its margin grid; the owner column is irrelevant here, so we build
   * the predicate without one (avoids referencing a non-existent column).
   */
  private gridScope(actor: WorkspaceActor): ScopePredicate {
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
      .prepare(`SELECT COALESCE(MAX(version), 0) + 1 AS next FROM margin_grids WHERE organization_id = ?`)
      .bind(organizationId)
      .first<{ next: number }>();
    return row?.next ?? 1;
  }

  private map(row: MarginGridRow): MarginGridRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      version: row.version,
      status: row.status,
      minMarginEurMwh: row.min_margin_eur_mwh,
      defaultMarginEurMwh: row.default_margin_eur_mwh,
      maxMarginEurMwh: row.max_margin_eur_mwh,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      createdAt: row.created_at,
    };
  }
}
