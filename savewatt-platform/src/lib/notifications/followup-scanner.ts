import type { NotificationType } from "./notification-config.ts";

export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;

export interface DueTaskCandidate {
  id: string;
  organizationId: string;
  assigneeUserId: string;
  title: string;
  dueAt: number;
}

export interface StaleLeadCandidate {
  id: string;
  organizationId: string;
  ownerUserId: string;
  legalName: string;
  updatedAt: number;
}

export interface StatusChangeCandidate {
  eventId: string;
  organizationId: string;
  dossierId: string;
  ownerUserId: string;
  ownerEmail: string | null;
  summary: string;
  from: string | null;
  to: string | null;
  createdAt: number;
}

export interface NotificationEmail {
  to: string;
  subject: string;
  html: string;
}

export interface NotificationPlan {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  email?: NotificationEmail;
}

export function planTaskDueReminders(
  tasks: DueTaskCandidate[],
  nowSeconds: number,
  windowHours: number,
): NotificationPlan[] {
  const horizon = nowSeconds + windowHours * SECONDS_PER_HOUR;
  return tasks
    .filter((task) => task.dueAt <= horizon)
    .map((task) => {
      const overdue = task.dueAt <= nowSeconds;
      return {
        organizationId: task.organizationId,
        userId: task.assigneeUserId,
        type: "TASK_DUE_REMINDER",
        title: overdue ? "Tâche en retard" : "Tâche à échéance proche",
        body: overdue
          ? `La tâche « ${task.title} » a dépassé son échéance.`
          : `La tâche « ${task.title} » arrive à échéance sous ${windowHours} h.`,
        payload: { taskId: task.id, dueAt: task.dueAt, overdue },
        dedupeKey: `task-due:${task.id}:${task.dueAt}`,
      };
    });
}

export function planStaleLeadFollowups(
  leads: StaleLeadCandidate[],
  nowSeconds: number,
  staleDays: number,
): NotificationPlan[] {
  const threshold = nowSeconds - staleDays * SECONDS_PER_DAY;
  return leads
    .filter((lead) => lead.updatedAt <= threshold)
    .map((lead) => ({
      organizationId: lead.organizationId,
      userId: lead.ownerUserId,
      type: "LEAD_FOLLOWUP_REMINDER",
      title: "Prospect sans relance",
      body: `Le prospect « ${lead.legalName} » est sans activité depuis ${staleDays} jour(s).`,
      payload: { leadId: lead.id, staleDays },
      dedupeKey: `lead-stale:${lead.id}:${staleDays}d`,
    }));
}

export function planDossierStatusNotifications(
  events: StatusChangeCandidate[],
  options: { sendEmail: boolean },
): NotificationPlan[] {
  return events.map((event) => {
    const plan: NotificationPlan = {
      organizationId: event.organizationId,
      userId: event.ownerUserId,
      type: "DOSSIER_STATUS_CHANGED",
      title: "Statut de dossier modifié",
      body: event.summary,
      payload: {
        dossierId: event.dossierId,
        eventId: event.eventId,
        from: event.from,
        to: event.to,
      },
      dedupeKey: `dossier-status:${event.eventId}`,
    };
    if (options.sendEmail && event.ownerEmail) {
      plan.email = {
        to: event.ownerEmail,
        subject: "SaveWatt — statut de dossier modifié",
        html: `<div style="font-family:Arial,sans-serif;color:#1d2b25;line-height:1.6;max-width:560px;">
          <p style="font-size:18px;font-weight:700;">Save<span style="color:#118a34;">Watt</span></p>
          <p>${escapeHtml(event.summary)}</p>
          <p style="color:#8a938c;font-size:11px;">AX TECH — ECOLED WAVE CONCEPT · 8 rue Marbeau, 75016 Paris</p>
        </div>`,
      };
    }
    return plan;
  });
}

export function planIdentity(plan: NotificationPlan): string {
  return `${plan.userId}:${plan.dedupeKey}`;
}

export function filterNewPlans(
  plans: NotificationPlan[],
  existingIdentities: ReadonlySet<string>,
): NotificationPlan[] {
  const seen = new Set<string>();
  return plans.filter((plan) => {
    const identity = planIdentity(plan);
    if (existingIdentities.has(identity) || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
