import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { childrenRatesWithinLimit, isValidRatePercent } from "./commission-shares";

export interface CommissionRateTreeNode {
  organizationId: string;
  parentId: string | null;
  name: string;
  kind: "OPERATOR" | "MASTER" | "SUB_REGIE" | "TEAM";
  depth: number;
  ratePercent: number | null;
  version: number | null;
  updatedAt: number | null;
  canEdit: boolean;
}

export interface CommissionRateTree {
  rootId: string;
  nodes: CommissionRateTreeNode[];
}

export interface CommissionRateVersion {
  id: string;
  organizationId: string;
  ratePercent: number;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  note: string | null;
  createdBy: string | null;
  createdAt: number;
  supersededAt: number | null;
}

interface TreeRow {
  id: string;
  parent_id: string | null;
  name: string;
  kind: CommissionRateTreeNode["kind"];
  depth: number;
  path: string;
  rate_percent: number | null;
  version: number | null;
  rate_created_at: number | null;
}

interface VersionRow {
  id: string;
  organization_id: string;
  rate_percent: number;
  version: number;
  status: CommissionRateVersion["status"];
  note: string | null;
  created_by_name: string | null;
  created_at: number;
  superseded_at: number | null;
}

const NETWORK_MANAGERS = new Set(["MASTER_ADMIN", "SUB_REGIE_ADMIN"]);

/**
 * Per-account commission rates. SaveWatt admins set any organization's rate
 * (typically each régie's share of the margin); régie and sous-régie admins set
 * their direct children's rates as a percentage of their own share.
 */
export class CommissionRateRepository {
  private readonly database: D1Database;

  constructor(database?: D1Database) {
    this.database = database ?? DatabaseManager.getDatabase();
  }

  /**
   * The actor's visible tree. Admins see the whole network from the operator
   * root; network managers see their own subtree (their own rate is shown but
   * read-only, since it is set by their parent); others see their own account.
   */
  async listTree(actor: WorkspaceActor): Promise<CommissionRateTree> {
    const scope = this.treeScope(actor);
    const result = await this.database
      .prepare(
        `SELECT org.id, org.parent_id, org.name, org.kind, org.depth, org.path,
                rate.rate_percent, rate.version, rate.created_at AS rate_created_at
         FROM organizations org
         LEFT JOIN commission_rates rate
           ON rate.organization_id = org.id AND rate.status = 'ACTIVE'
         WHERE ${scope.sql}
         ORDER BY org.path`,
      )
      .bind(...scope.bindings)
      .all<TreeRow>();
    const rows = result.results ?? [];
    const root =
      actor.role === "SUPER_ADMIN"
        ? rows.find((row) => row.kind === "OPERATOR") ?? rows[0]
        : rows.find((row) => row.id === actor.orgId);
    return {
      rootId: root?.id ?? actor.orgId,
      nodes: rows.map((row) => ({
        organizationId: row.id,
        parentId: row.parent_id,
        name: row.name,
        kind: row.kind,
        depth: row.depth,
        ratePercent: row.rate_percent,
        version: row.version,
        updatedAt: row.rate_created_at,
        canEdit: this.canEditOrganization(actor, row),
      })),
    };
  }

  async history(actor: WorkspaceActor, organizationId: string): Promise<CommissionRateVersion[]> {
    await this.visibleOrganization(actor, organizationId);
    const result = await this.database
      .prepare(
        `SELECT rate.*, author.display_name AS created_by_name
         FROM commission_rates rate
         LEFT JOIN users author ON author.id = rate.created_by_user_id
         WHERE rate.organization_id = ?
         ORDER BY rate.version DESC`,
      )
      .bind(organizationId)
      .all<VersionRow>();
    return (result.results ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      ratePercent: row.rate_percent,
      version: row.version,
      status: row.status,
      note: row.note,
      createdBy: row.created_by_name,
      createdAt: row.created_at,
      supersededAt: row.superseded_at,
    }));
  }

  /** Publishes a new ACTIVE rate version and supersedes the previous one. */
  async setRate(
    actor: WorkspaceActor,
    organizationId: string,
    ratePercent: unknown,
    note: unknown,
  ): Promise<CommissionRateVersion> {
    if (!isValidRatePercent(ratePercent)) throw new CrmError("CRM_INVALID_INPUT", 400, "ratePercent");
    const cleanNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 280) : null;
    const organization = await this.visibleOrganization(actor, organizationId);
    if (!this.canEditOrganization(actor, organization)) throw new CrmError("CRM_FORBIDDEN", 403);

    const siblings = await this.database
      .prepare(
        `SELECT rate.rate_percent FROM commission_rates rate
         JOIN organizations org ON org.id = rate.organization_id
         WHERE org.parent_id = ? AND org.id != ? AND rate.status = 'ACTIVE'`,
      )
      .bind(organization.parent_id, organizationId)
      .all<{ rate_percent: number }>();
    const siblingRates = (siblings.results ?? []).map((row) => row.rate_percent);
    if (!childrenRatesWithinLimit([...siblingRates, ratePercent])) {
      throw new CrmError("CRM_CONFLICT", 409, "ratePercentTotal");
    }

    const next = await this.database
      .prepare(`SELECT COALESCE(MAX(version), 0) + 1 AS next FROM commission_rates WHERE organization_id = ?`)
      .bind(organizationId)
      .first<{ next: number }>();
    const version = next?.next ?? 1;
    const id = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE commission_rates SET status = 'SUPERSEDED', superseded_at = unixepoch()
           WHERE organization_id = ? AND status = 'ACTIVE'`,
        )
        .bind(organizationId),
      this.database
        .prepare(
          `INSERT INTO commission_rates (id, organization_id, rate_percent, version, status, note, created_by_user_id)
           VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
        )
        .bind(id, organizationId, ratePercent, version, cleanNote, actor.userId),
      this.database
        .prepare(
          `INSERT INTO audit_events (id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json)
           VALUES (?, ?, ?, 'COMMISSION_RATE_SET', 'COMMISSION_RATE', ?, ?)`,
        )
        .bind(randomUUID(), organizationId, actor.userId, id, JSON.stringify({ ratePercent, version })),
    ]);
    const [latest] = await this.history(actor, organizationId);
    if (!latest || latest.id !== id) throw new Error("COMMISSION_RATE_NOT_FOUND_AFTER_CREATE");
    return latest;
  }

  private treeScope(actor: WorkspaceActor): { sql: string; bindings: string[] } {
    if (actor.role === "SUPER_ADMIN") return { sql: "1 = 1", bindings: [] };
    if (NETWORK_MANAGERS.has(actor.role)) {
      return { sql: "(org.path = ? OR org.path LIKE ?)", bindings: [actor.orgPath, `${actor.orgPath}.%`] };
    }
    return { sql: "org.id = ?", bindings: [actor.orgId] };
  }

  private async visibleOrganization(actor: WorkspaceActor, organizationId: string): Promise<TreeRow> {
    const scope = this.treeScope(actor);
    const row = await this.database
      .prepare(
        `SELECT org.id, org.parent_id, org.name, org.kind, org.depth, org.path,
                NULL AS rate_percent, NULL AS version, NULL AS rate_created_at
         FROM organizations org WHERE org.id = ? AND ${scope.sql} LIMIT 1`,
      )
      .bind(organizationId, ...scope.bindings)
      .first<TreeRow>();
    if (!row) throw new CrmError("CRM_NOT_FOUND", 404);
    return row;
  }

  private canEditOrganization(actor: WorkspaceActor, organization: Pick<TreeRow, "kind" | "parent_id">): boolean {
    if (organization.kind === "OPERATOR" || !organization.parent_id) return false;
    if (actor.role === "SUPER_ADMIN") return true;
    return NETWORK_MANAGERS.has(actor.role) && organization.parent_id === actor.orgId;
  }
}
