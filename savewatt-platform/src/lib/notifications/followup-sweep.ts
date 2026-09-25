import "server-only";

import { sendEmail, type EmailBinding } from "@/lib/email/email-sender";
import { resolveFollowupConfig } from "./notification-config";
import {
  filterNewPlans,
  planDossierStatusNotifications,
  planStaleLeadFollowups,
  planTaskDueReminders,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  type DueTaskCandidate,
  type NotificationPlan,
  type StaleLeadCandidate,
  type StatusChangeCandidate,
} from "./followup-scanner";
import { NotificationRepository } from "./notification-repository";

export interface FollowupSweepEnv {
  DB: D1Database;
  EMAIL?: EmailBinding;
  FOLLOWUPS_STALE_LEAD_DAYS?: string;
  FOLLOWUPS_SEND_STATUS_EMAILS?: string;
}

export interface FollowupSweepResult {
  tasksScanned: number;
  leadsScanned: number;
  statusEventsScanned: number;
  notificationsPlanned: number;
  notificationsCreated: number;
  emailsSent: number;
  emailsSkipped: number;
}

interface TaskRow {
  id: string;
  organization_id: string;
  assignee_user_id: string;
  title: string;
  due_at: number;
}

interface LeadRow {
  id: string;
  organization_id: string;
  owner_user_id: string;
  legal_name: string;
  updated_at: number;
}

interface StatusEventRow {
  event_id: string;
  organization_id: string;
  dossier_id: string;
  owner_user_id: string;
  owner_email: string | null;
  summary: string;
  metadata_json: string;
  created_at: number;
}

/**
 * Daily follow-up sweep: task due reminders, stale-lead follow-ups and
 * dossier status-change notifications (optionally mirrored by email).
 * Idempotent: dedupe keys + INSERT OR IGNORE make re-runs no-ops.
 */
export async function runFollowupSweep(
  env: FollowupSweepEnv,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<FollowupSweepResult> {
  const config = resolveFollowupConfig(env);
  const database = env.DB;

  const [tasks, leads, statusEvents] = await Promise.all([
    loadDueTasks(database, nowSeconds, config.taskReminderWindowHours),
    loadStaleLeads(database, nowSeconds, config.staleLeadDays),
    loadStatusChanges(database, nowSeconds, config.sweepWindowHours),
  ]);

  const plans = [
    ...planTaskDueReminders(tasks, nowSeconds, config.taskReminderWindowHours),
    ...planStaleLeadFollowups(leads, nowSeconds, config.staleLeadDays),
    ...planDossierStatusNotifications(statusEvents, {
      sendEmail: config.sendStatusChangeEmails,
    }),
  ];

  const repository = new NotificationRepository(database);
  const recipients = [...new Set(plans.map((plan) => plan.userId))];
  const existing = await repository.existingIdentities(recipients);
  const fresh = filterNewPlans(plans, existing);

  let created = 0;
  const createdPlans: NotificationPlan[] = [];
  for (const plan of fresh) {
    if (await repository.create(plan)) {
      created += 1;
      createdPlans.push(plan);
    }
  }

  let emailsSent = 0;
  let emailsSkipped = 0;
  for (const plan of createdPlans) {
    if (!plan.email) continue;
    const outcome = await sendEmail(
      { to: [plan.email.to], subject: plan.email.subject, html: plan.email.html },
      env.EMAIL,
    );
    if (outcome.kind === "sent") emailsSent += 1;
    else emailsSkipped += 1;
  }

  return {
    tasksScanned: tasks.length,
    leadsScanned: leads.length,
    statusEventsScanned: statusEvents.length,
    notificationsPlanned: plans.length,
    notificationsCreated: created,
    emailsSent,
    emailsSkipped,
  };
}

async function loadDueTasks(
  database: D1Database,
  nowSeconds: number,
  windowHours: number,
): Promise<DueTaskCandidate[]> {
  const horizon = nowSeconds + windowHours * SECONDS_PER_HOUR;
  const result = await database
    .prepare(
      `SELECT id, organization_id, assignee_user_id, title, due_at
       FROM tasks
       WHERE status IN ('OPEN', 'IN_PROGRESS')
         AND due_at IS NOT NULL
         AND due_at <= ?`,
    )
    .bind(horizon)
    .all<TaskRow>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    assigneeUserId: row.assignee_user_id,
    title: row.title,
    dueAt: row.due_at,
  }));
}

async function loadStaleLeads(
  database: D1Database,
  nowSeconds: number,
  staleDays: number,
): Promise<StaleLeadCandidate[]> {
  const threshold = nowSeconds - staleDays * SECONDS_PER_DAY;
  const result = await database
    .prepare(
      `SELECT id, organization_id, owner_user_id, legal_name, updated_at
       FROM leads
       WHERE status = 'NEW' AND updated_at <= ?`,
    )
    .bind(threshold)
    .all<LeadRow>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    ownerUserId: row.owner_user_id,
    legalName: row.legal_name,
    updatedAt: row.updated_at,
  }));
}

async function loadStatusChanges(
  database: D1Database,
  nowSeconds: number,
  windowHours: number,
): Promise<StatusChangeCandidate[]> {
  const since = nowSeconds - windowHours * SECONDS_PER_HOUR;
  const result = await database
    .prepare(
      `SELECT event.id AS event_id, event.organization_id, event.dossier_id,
              dossier.owner_user_id, owner.email AS owner_email,
              event.summary, event.metadata_json, event.created_at
       FROM dossier_events event
       JOIN dossiers dossier ON dossier.id = event.dossier_id
       JOIN users owner ON owner.id = dossier.owner_user_id
       WHERE event.event_type = 'STATUS_CHANGED' AND event.created_at >= ?`,
    )
    .bind(since)
    .all<StatusEventRow>();
  return (result.results ?? []).map((row) => {
    let metadata: { from?: string; to?: string } = {};
    try {
      metadata = JSON.parse(row.metadata_json) as { from?: string; to?: string };
    } catch {
      metadata = {};
    }
    return {
      eventId: row.event_id,
      organizationId: row.organization_id,
      dossierId: row.dossier_id,
      ownerUserId: row.owner_user_id,
      ownerEmail: row.owner_email,
      summary: row.summary,
      from: metadata.from ?? null,
      to: metadata.to ?? null,
      createdAt: row.created_at,
    };
  });
}
