import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "./crm-errors";
import { CrmScopePolicy } from "./crm-scope-policy";
import type {
  CreateTaskInput,
  DossierEventRecord,
  TaskRecord,
  TaskStatus,
} from "./crm-types";

interface EventRow {
  id: string;
  dossier_id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  event_type: string;
  summary: string;
  metadata_json: string;
  created_at: number;
}

interface TaskRow {
  id: string;
  organization_id: string;
  dossier_id: string | null;
  client_id: string | null;
  assignee_user_id: string;
  assignee_name: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_at: number | null;
  completed_at: number | null;
  version: number;
  created_at: number;
  updated_at: number;
}

interface ResourceContext {
  organization_id: string;
  owner_user_id: string;
}

export class ActivityRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  async listEvents(actor: WorkspaceActor, dossierId: string): Promise<DossierEventRecord[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const result = await this.database
      .prepare(
        `SELECT event.id, event.dossier_id, event.actor_user_id,
                actor.display_name AS actor_name, event.event_type, event.summary,
                event.metadata_json, event.created_at
         FROM dossier_events event
         JOIN dossiers dossier ON dossier.id = event.dossier_id
         JOIN organizations resource_org ON resource_org.id = dossier.organization_id
         LEFT JOIN users actor ON actor.id = event.actor_user_id
         WHERE dossier.id = ? AND ${scope.sql}
         ORDER BY event.created_at DESC`,
      )
      .bind(dossierId, ...scope.bindings)
      .all<EventRow>();
    return (result.results ?? []).map((row) => ({
      id: row.id,
      dossierId: row.dossier_id,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      eventType: row.event_type,
      summary: row.summary,
      metadata: this.parseMetadata(row.metadata_json),
      createdAt: row.created_at,
    }));
  }

  async listTasks(actor: WorkspaceActor, dossierId: string): Promise<TaskRecord[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const result = await this.database
      .prepare(
        `SELECT task.*, assignee.display_name AS assignee_name
         FROM tasks task
         JOIN dossiers dossier ON dossier.id = task.dossier_id
         JOIN organizations resource_org ON resource_org.id = dossier.organization_id
         JOIN users assignee ON assignee.id = task.assignee_user_id
         WHERE dossier.id = ? AND ${scope.sql}
         ORDER BY CASE task.status
           WHEN 'OPEN' THEN 1 WHEN 'IN_PROGRESS' THEN 2
           WHEN 'COMPLETED' THEN 3 ELSE 4 END,
           CASE WHEN task.due_at IS NULL THEN 1 ELSE 0 END, task.due_at, task.created_at`,
      )
      .bind(dossierId, ...scope.bindings)
      .all<TaskRow>();
    return (result.results ?? []).map((row) => this.mapTask(row));
  }

  async createTask(actor: WorkspaceActor, input: CreateTaskInput): Promise<TaskRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const context = await this.findResourceContext(actor, input);
    if (!context) throw new CrmError("CRM_NOT_FOUND", 404);
    const assigneeUserId = input.assigneeUserId ?? actor.userId;
    const assigneeAllowed = await this.isActiveOrganizationMember(
      context.organization_id,
      assigneeUserId,
    );
    if (!assigneeAllowed) throw new CrmError("CRM_INVALID_INPUT", 400, "assigneeUserId");

    const taskId = randomUUID();
    const statements = [
      this.database
        .prepare(
          `INSERT INTO tasks (
             id, organization_id, dossier_id, client_id, assignee_user_id,
             created_by_user_id, title, description, due_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          taskId,
          context.organization_id,
          input.dossierId ?? null,
          input.clientId ?? null,
          assigneeUserId,
          actor.userId,
          input.title,
          input.description ?? null,
          input.dueAt ?? null,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) VALUES (?, ?, ?, 'TASK_CREATED', 'TASK', ?, ?)`,
        )
        .bind(
          randomUUID(),
          context.organization_id,
          actor.userId,
          taskId,
          JSON.stringify({ dossierId: input.dossierId, clientId: input.clientId }),
        ),
    ];
    if (input.dossierId) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO dossier_events (
               id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
             ) VALUES (?, ?, ?, ?, 'TASK_CREATED', ?, ?)`,
          )
          .bind(
            randomUUID(),
            context.organization_id,
            input.dossierId,
            actor.userId,
            `Tâche créée : ${input.title}`,
            JSON.stringify({ taskId, assigneeUserId, dueAt: input.dueAt }),
          ),
      );
    }
    await this.database.batch(statements);
    const created = await this.findTask(actor, taskId);
    if (!created) throw new CrmError("CRM_NOT_FOUND", 404);
    return created;
  }

  async updateTaskStatus(
    actor: WorkspaceActor,
    taskId: string,
    status: TaskStatus,
    expectedVersion: number,
  ): Promise<TaskRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const current = await this.findTask(actor, taskId);
    if (!current) throw new CrmError("CRM_NOT_FOUND", 404);
    if (current.version !== expectedVersion) throw new CrmError("CRM_CONFLICT", 409, "version");
    const completedAt = status === "COMPLETED" ? Math.floor(Date.now() / 1_000) : null;
    const result = await this.database
      .prepare(
        `UPDATE tasks SET status = ?, completed_at = ?, version = version + 1,
           updated_at = unixepoch()
         WHERE id = ? AND version = ?`,
      )
      .bind(status, completedAt, taskId, expectedVersion)
      .run();
    if ((result.meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409);
    const updated = await this.findTask(actor, taskId);
    if (!updated) throw new CrmError("CRM_NOT_FOUND", 404);
    return updated;
  }

  private async findTask(actor: WorkspaceActor, taskId: string): Promise<TaskRecord | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "dossier.owner_user_id");
    const row = await this.database
      .prepare(
        `SELECT task.*, assignee.display_name AS assignee_name
         FROM tasks task
         LEFT JOIN dossiers dossier ON dossier.id = task.dossier_id
         LEFT JOIN clients client ON client.id = task.client_id
         JOIN organizations resource_org ON resource_org.id = task.organization_id
         JOIN users assignee ON assignee.id = task.assignee_user_id
         WHERE task.id = ?
           AND ${scope.sql.replaceAll("dossier.owner_user_id", "COALESCE(dossier.owner_user_id, client.owner_user_id)")}
         LIMIT 1`,
      )
      .bind(taskId, ...scope.bindings)
      .first<TaskRow>();
    return row ? this.mapTask(row) : null;
  }

  private async findResourceContext(
    actor: WorkspaceActor,
    input: CreateTaskInput,
  ): Promise<ResourceContext | null> {
    const table = input.dossierId ? "dossiers" : "clients";
    const alias = input.dossierId ? "dossier" : "client";
    const id = input.dossierId ?? input.clientId!;
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", `${alias}.owner_user_id`);
    return this.database
      .prepare(
        `SELECT ${alias}.organization_id, ${alias}.owner_user_id
         FROM ${table} ${alias}
         JOIN organizations resource_org ON resource_org.id = ${alias}.organization_id
         WHERE ${alias}.id = ? AND ${scope.sql} LIMIT 1`,
      )
      .bind(id, ...scope.bindings)
      .first<ResourceContext>();
  }

  private async isActiveOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const row = await this.database
      .prepare(
        `SELECT user_id FROM memberships
         WHERE organization_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1`,
      )
      .bind(organizationId, userId)
      .first<{ user_id: string }>();
    return Boolean(row);
  }

  private mapTask(row: TaskRow): TaskRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      dossierId: row.dossier_id,
      clientId: row.client_id,
      assigneeUserId: row.assignee_user_id,
      assigneeName: row.assignee_name,
      createdByUserId: row.created_by_user_id,
      title: row.title,
      description: row.description,
      status: row.status,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private parseMetadata(value: string): Record<string, unknown> {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
