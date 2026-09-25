import "server-only";

import { randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import type { NotificationType } from "./notification-config";
import type { NotificationPlan } from "./followup-scanner";

export interface NotificationRecord {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: number | null;
  createdAt: number;
}

interface NotificationRow {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload_json: string;
  read_at: number | null;
  created_at: number;
}

export class NotificationRepository {
  constructor(private readonly database: D1Database = DatabaseManager.getDatabase()) {}

  /** Insert one plan; returns false when the dedupe key already exists for this user. */
  async create(plan: NotificationPlan): Promise<boolean> {
    const result = await this.database
      .prepare(
        `INSERT OR IGNORE INTO notifications (
           id, organization_id, user_id, type, title, body, payload_json, dedupe_key
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        randomUUID(),
        plan.organizationId,
        plan.userId,
        plan.type,
        plan.title,
        plan.body,
        JSON.stringify(plan.payload),
        plan.dedupeKey,
      )
      .run();
    return (result.meta.changes ?? 0) === 1;
  }

  /** Existing `${userId}:${dedupeKey}` identities, used to keep sweeps idempotent. */
  async existingIdentities(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const placeholders = userIds.map(() => "?").join(", ");
    const result = await this.database
      .prepare(
        `SELECT user_id, dedupe_key FROM notifications WHERE user_id IN (${placeholders})`,
      )
      .bind(...userIds)
      .all<{ user_id: string; dedupe_key: string }>();
    return new Set(
      (result.results ?? []).map((row) => `${row.user_id}:${row.dedupe_key}`),
    );
  }

  async listForUser(
    organizationId: string,
    userId: string,
    limit = 50,
  ): Promise<NotificationRecord[]> {
    const result = await this.database
      .prepare(
        `SELECT id, organization_id, user_id, type, title, body, payload_json, read_at, created_at
         FROM notifications
         WHERE organization_id = ? AND user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(organizationId, userId, limit)
      .all<NotificationRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async unreadCount(organizationId: string, userId: string): Promise<number> {
    const row = await this.database
      .prepare(
        `SELECT COUNT(*) AS unread
         FROM notifications
         WHERE organization_id = ? AND user_id = ? AND read_at IS NULL`,
      )
      .bind(organizationId, userId)
      .first<{ unread: number }>();
    return row?.unread ?? 0;
  }

  /** Mark one notification read; scoped to the owner so ids cannot be crossed. */
  async markRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.database
      .prepare(
        `UPDATE notifications SET read_at = unixepoch()
         WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      )
      .bind(notificationId, userId)
      .run();
    return (result.meta.changes ?? 0) === 1;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.database
      .prepare(
        `UPDATE notifications SET read_at = unixepoch()
         WHERE user_id = ? AND read_at IS NULL`,
      )
      .bind(userId)
      .run();
    return result.meta.changes ?? 0;
  }

  private map(row: NotificationRow): NotificationRecord {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body,
      payload,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }
}
