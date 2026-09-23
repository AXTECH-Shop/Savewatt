import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import type { DossierStatus } from "@/lib/types";
import { CrmError } from "./crm-errors";
import { CrmScopePolicy } from "./crm-scope-policy";
import { DossierStatusManager } from "./dossier-status-manager";
import type { DossierSummary } from "./crm-types";

interface DossierRow {
  id: string;
  organization_id: string;
  client_id: string;
  site_id: string | null;
  owner_user_id: string;
  owner_name: string;
  client_name: string;
  pdl: string | null;
  segment: DossierSummary["segment"];
  status: DossierStatus;
  next_task: string | null;
  next_task_due_at: number | null;
  version: number;
  created_at: number;
  updated_at: number;
}

export class DossierRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
    private readonly statusManager = new DossierStatusManager(),
  ) {}

  async list(actor: WorkspaceActor, status?: DossierStatus): Promise<DossierSummary[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const statusClause = status ? "AND dossier.status = ?" : "";
    const result = await this.database
      .prepare(`${this.selectSql()} WHERE ${scope.sql} ${statusClause} ORDER BY dossier.updated_at DESC`)
      .bind(...scope.bindings, ...(status ? [status] : []))
      .all<DossierRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async find(actor: WorkspaceActor, dossierId: string): Promise<DossierSummary | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(`${this.selectSql()} WHERE dossier.id = ? AND ${scope.sql} LIMIT 1`)
      .bind(dossierId, ...scope.bindings)
      .first<DossierRow>();
    return row ? this.map(row) : null;
  }

  async updateStatus(
    actor: WorkspaceActor,
    dossierId: string,
    nextStatus: DossierStatus,
    expectedVersion: number,
  ): Promise<DossierSummary> {
    this.scopePolicy.assertCanWrite(actor);
    const current = await this.find(actor, dossierId);
    if (!current) throw new CrmError("CRM_NOT_FOUND", 404);
    if (current.version !== expectedVersion) throw new CrmError("CRM_CONFLICT", 409, "version");
    this.statusManager.assertTransition(current.status, nextStatus);
    if (current.status === nextStatus) return current;

    const result = await this.database.batch([
      this.database
        .prepare(
          `UPDATE dossiers SET status = ?, version = version + 1, updated_at = unixepoch()
           WHERE id = ? AND version = ? AND status = ?`,
        )
        .bind(nextStatus, dossierId, expectedVersion, current.status),
      this.database
        .prepare(
          `INSERT INTO dossier_events (
             id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
           ) SELECT ?, organization_id, id, ?, 'STATUS_CHANGED', ?, ?
             FROM dossiers WHERE id = ? AND status = ? AND version = ?`,
        )
        .bind(
          randomUUID(),
          actor.userId,
          `Statut modifié : ${current.status} → ${nextStatus}`,
          JSON.stringify({ from: current.status, to: nextStatus }),
          dossierId,
          nextStatus,
          expectedVersion + 1,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) SELECT ?, organization_id, ?, 'DOSSIER_STATUS_CHANGED', 'DOSSIER', id, ?
             FROM dossiers WHERE id = ? AND status = ? AND version = ?`,
        )
        .bind(
          randomUUID(),
          actor.userId,
          JSON.stringify({ from: current.status, to: nextStatus }),
          dossierId,
          nextStatus,
          expectedVersion + 1,
        ),
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409);
    const updated = await this.find(actor, dossierId);
    if (!updated) throw new CrmError("CRM_NOT_FOUND", 404);
    return updated;
  }

  private selectSql(): string {
    return `SELECT
        dossier.id, dossier.organization_id, dossier.client_id, dossier.site_id,
        dossier.owner_user_id, owner.display_name AS owner_name,
        client.legal_name AS client_name, site.pdl, site.segment, dossier.status,
        dossier.version, dossier.created_at, dossier.updated_at,
        next_task.title AS next_task, next_task.due_at AS next_task_due_at
      FROM dossiers dossier
      JOIN organizations resource_org ON resource_org.id = dossier.organization_id
      JOIN clients client ON client.id = dossier.client_id
      JOIN users owner ON owner.id = dossier.owner_user_id
      LEFT JOIN sites site ON site.id = dossier.site_id
      LEFT JOIN tasks next_task ON next_task.id = (
        SELECT task.id FROM tasks task
        WHERE task.dossier_id = dossier.id AND task.status IN ('OPEN', 'IN_PROGRESS')
        ORDER BY CASE WHEN task.due_at IS NULL THEN 1 ELSE 0 END, task.due_at, task.created_at
        LIMIT 1
      )`;
  }

  private map(row: DossierRow): DossierSummary {
    return {
      id: row.id,
      organizationId: row.organization_id,
      clientId: row.client_id,
      siteId: row.site_id,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      clientName: row.client_name,
      pdl: row.pdl,
      segment: row.segment,
      status: row.status,
      nextTask: row.next_task,
      nextTaskDueAt: row.next_task_due_at,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
