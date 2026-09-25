import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import {
  DEFAULT_WORKFLOW_STAGES,
  parseWorkflowStages,
  readStoredStages,
  WorkflowStageError,
  type WorkflowStage,
} from "./workflow-stages";

export interface WorkflowVersion {
  id: string;
  organizationId: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  stages: WorkflowStage[];
  note: string | null;
  createdBy: string | null;
  createdAt: number;
  supersededAt: number | null;
}

export interface EffectiveWorkflow {
  stages: WorkflowStage[];
  /** The version in force, or null when the platform defaults apply. */
  version: WorkflowVersion | null;
  /** True when the version comes from a parent organization (or the defaults). */
  inherited: boolean;
}

interface VersionRow {
  id: string;
  organization_id: string;
  version: number;
  status: WorkflowVersion["status"];
  stages_json: string;
  note: string | null;
  created_by_name: string | null;
  created_at: number;
  superseded_at: number | null;
}

const EDITORS = new Set(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);

export function canEditWorkflow(role: string): boolean {
  return EDITORS.has(role);
}

/**
 * Versioned commercial workflow per organization. An organization without its
 * own version inherits the nearest ancestor's (ultimately SaveWatt's), then the
 * platform defaults.
 */
export class WorkflowRepository {
  private readonly database: D1Database;

  constructor(database?: D1Database) {
    this.database = database ?? DatabaseManager.getDatabase();
  }

  async resolveEffective(actor: WorkspaceActor): Promise<EffectiveWorkflow> {
    const segments = actor.orgPath.split(".");
    const candidates = segments.map((_, index) => segments.slice(0, index + 1).join("."));
    const placeholders = candidates.map(() => "?").join(", ");
    const row = await this.database
      .prepare(
        `SELECT workflow.*, author.display_name AS created_by_name
         FROM workflow_versions workflow
         JOIN organizations org ON org.id = workflow.organization_id
         LEFT JOIN users author ON author.id = workflow.created_by_user_id
         WHERE org.path IN (${placeholders}) AND workflow.status = 'ACTIVE'
         ORDER BY LENGTH(org.path) DESC LIMIT 1`,
      )
      .bind(...candidates)
      .first<VersionRow>();
    if (!row) {
      return { stages: DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage })), version: null, inherited: true };
    }
    const version = this.map(row);
    return { stages: version.stages, version, inherited: version.organizationId !== actor.orgId };
  }

  /** Versions published by the actor's own organization, newest first. */
  async history(actor: WorkspaceActor): Promise<WorkflowVersion[]> {
    const result = await this.database
      .prepare(
        `SELECT workflow.*, author.display_name AS created_by_name
         FROM workflow_versions workflow
         LEFT JOIN users author ON author.id = workflow.created_by_user_id
         WHERE workflow.organization_id = ?
         ORDER BY workflow.version DESC`,
      )
      .bind(actor.orgId)
      .all<VersionRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async publish(actor: WorkspaceActor, input: unknown, note: unknown): Promise<WorkflowVersion> {
    if (!canEditWorkflow(actor.role)) throw new CrmError("CRM_FORBIDDEN", 403);
    let stages: WorkflowStage[];
    try {
      stages = parseWorkflowStages(input);
    } catch (error) {
      if (error instanceof WorkflowStageError) throw new CrmError("CRM_INVALID_INPUT", 400, error.field);
      throw error;
    }
    const cleanNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 280) : null;
    const next = await this.database
      .prepare(`SELECT COALESCE(MAX(version), 0) + 1 AS next FROM workflow_versions WHERE organization_id = ?`)
      .bind(actor.orgId)
      .first<{ next: number }>();
    const version = next?.next ?? 1;
    const id = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE workflow_versions SET status = 'SUPERSEDED', superseded_at = unixepoch()
           WHERE organization_id = ? AND status = 'ACTIVE'`,
        )
        .bind(actor.orgId),
      this.database
        .prepare(
          `INSERT INTO workflow_versions (id, organization_id, version, status, stages_json, note, created_by_user_id)
           VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        )
        .bind(id, actor.orgId, version, JSON.stringify(stages), cleanNote, actor.userId),
      this.database
        .prepare(
          `INSERT INTO audit_events (id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json)
           VALUES (?, ?, ?, 'WORKFLOW_PUBLISHED', 'WORKFLOW_VERSION', ?, ?)`,
        )
        .bind(randomUUID(), actor.orgId, actor.userId, id, JSON.stringify({ version })),
    ]);
    const [latest] = await this.history(actor);
    if (!latest || latest.id !== id) throw new Error("WORKFLOW_NOT_FOUND_AFTER_PUBLISH");
    return latest;
  }

  private map(row: VersionRow): WorkflowVersion {
    return {
      id: row.id,
      organizationId: row.organization_id,
      version: row.version,
      status: row.status,
      stages: readStoredStages(row.stages_json),
      note: row.note,
      createdBy: row.created_by_name,
      createdAt: row.created_at,
      supersededAt: row.superseded_at,
    };
  }
}
