import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import type { ScopePredicate } from "@/lib/crm/crm-scope-policy";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import { canSeeInternalPricing } from "./offer-visibility";
import type { MarginGridRecord, MarginGridRoleScope } from "./offer-types";

interface MarginGridRow {
  id: string;
  organization_id: string;
  version: number;
  status: MarginGridRecord["status"];
  role_scope: MarginGridRoleScope;
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

  /**
   * Effective ACTIVE grid for the organization on the given ISO date (today by
   * default), picked by the actor's account type: operator roles use the ADMIN
   * grid, régie roles use the REGIE grid (falling back to the ADMIN grid when
   * the org has no REGIE grid yet).
   */
  async resolveEffective(actor: WorkspaceActor, onDate?: string): Promise<MarginGridRecord | null> {
    const date = onDate ?? new Date().toISOString().slice(0, 10);
    const roleScope: MarginGridRoleScope = canSeeInternalPricing(actor.role) ? "ADMIN" : "REGIE";
    const grid = await this.findEffective(actor, roleScope, date);
    if (grid || roleScope === "ADMIN") return grid;
    return this.findEffective(actor, "ADMIN", date);
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
    input: Omit<MarginGridRecord, "id" | "version" | "status" | "createdAt" | "roleScope"> & {
      roleScope?: MarginGridRoleScope;
    },
  ): Promise<MarginGridRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const roleScope = input.roleScope ?? "ADMIN";
    if (roleScope === "REGIE") {
      // Régie grids may never exceed the admin ceiling (repository-enforced;
      // not expressible as a SQL CHECK across rows/orgs).
      const adminGrid = await this.findEffectiveAdminGrid(actor.orgId, input.effectiveFrom);
      if (!adminGrid) {
        throw new CrmError("OFFER_MARGIN_GRID_MISSING", 400, "adminMarginGrid");
      }
      if (input.maxMarginEurMwh > adminGrid.maxMarginEurMwh) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "maxMarginEurMwh");
      }
    }
    const nextVersion = await this.nextVersion(actor.orgId);
    const gridId = randomUUID();
    await this.database
      .prepare(
        `INSERT INTO margin_grids (
           id, organization_id, version, status, role_scope,
           min_margin_eur_mwh, default_margin_eur_mwh, max_margin_eur_mwh,
           effective_from, effective_to, created_by_user_id
         ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        gridId,
        actor.orgId,
        nextVersion,
        roleScope,
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

  private async findEffective(
    actor: WorkspaceActor,
    roleScope: MarginGridRoleScope,
    date: string,
  ): Promise<MarginGridRecord | null> {
    const scope = this.gridScope(actor);
    const row = await this.database
      .prepare(
        `SELECT grid.* FROM margin_grids grid
         JOIN organizations resource_org ON resource_org.id = grid.organization_id
         WHERE grid.organization_id = ? AND ${scope.sql}
           AND grid.role_scope = ?
           AND grid.status = 'ACTIVE'
           AND grid.effective_from <= ? AND (grid.effective_to IS NULL OR grid.effective_to >= ?)
         ORDER BY grid.version DESC LIMIT 1`,
      )
      .bind(actor.orgId, ...scope.bindings, roleScope, date, date)
      .first<MarginGridRow>();
    return row ? this.map(row) : null;
  }

  /**
   * ADMIN grid governing a régie grid: same org first, then the nearest
   * ancestor org up the path hierarchy. Internal enforcement query — nothing
   * from the admin grid is returned to the caller's client.
   */
  private async findEffectiveAdminGrid(
    organizationId: string,
    onDate: string,
  ): Promise<MarginGridRecord | null> {
    const org = await this.database
      .prepare(`SELECT id, path FROM organizations WHERE id = ?`)
      .bind(organizationId)
      .first<{ id: string; path: string }>();
    if (!org) return null;
    const paths = org.path.split(".");
    const candidates = paths.map((_, index) => paths.slice(0, index + 1).join(".")).reverse();
    const placeholders = candidates.map(() => "?").join(", ");
    const row = await this.database
      .prepare(
        `SELECT grid.* FROM margin_grids grid
         JOIN organizations resource_org ON resource_org.id = grid.organization_id
         WHERE resource_org.path IN (${placeholders})
           AND grid.role_scope = 'ADMIN'
           AND grid.status = 'ACTIVE'
           AND grid.effective_from <= ? AND (grid.effective_to IS NULL OR grid.effective_to >= ?)
         ORDER BY LENGTH(resource_org.path) DESC, grid.version DESC LIMIT 1`,
      )
      .bind(...candidates, onDate, onDate)
      .first<MarginGridRow>();
    return row ? this.map(row) : null;
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
      roleScope: row.role_scope,
      minMarginEurMwh: row.min_margin_eur_mwh,
      defaultMarginEurMwh: row.default_margin_eur_mwh,
      maxMarginEurMwh: row.max_margin_eur_mwh,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      createdAt: row.created_at,
    };
  }
}
