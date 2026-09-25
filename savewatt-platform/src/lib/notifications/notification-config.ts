export const NOTIFICATION_TYPES = [
  "TASK_DUE_REMINDER",
  "LEAD_FOLLOWUP_REMINDER",
  "DOSSIER_STATUS_CHANGED",
  "OFFER_DELIVERY_UPDATE",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface FollowupConfig {
  /** Days without activity before a NEW lead triggers a follow-up reminder. */
  staleLeadDays: number;
  /** Tasks due within this horizon (or already overdue) get a reminder. */
  taskReminderWindowHours: number;
  /** Look-back window for dossier status events, with overlap so a daily cron misses nothing. */
  sweepWindowHours: number;
  /** When true, dossier status changes also trigger a transactional email. */
  sendStatusChangeEmails: boolean;
}

export const DEFAULT_FOLLOWUP_CONFIG: FollowupConfig = {
  staleLeadDays: 3,
  taskReminderWindowHours: 24,
  sweepWindowHours: 25,
  sendStatusChangeEmails: false,
};

export function resolveFollowupConfig(env: {
  FOLLOWUPS_STALE_LEAD_DAYS?: string;
  FOLLOWUPS_SEND_STATUS_EMAILS?: string;
}): FollowupConfig {
  const staleLeadDays = Number(env.FOLLOWUPS_STALE_LEAD_DAYS);
  return {
    ...DEFAULT_FOLLOWUP_CONFIG,
    staleLeadDays:
      Number.isFinite(staleLeadDays) && staleLeadDays > 0
        ? staleLeadDays
        : DEFAULT_FOLLOWUP_CONFIG.staleLeadDays,
    sendStatusChangeEmails: env.FOLLOWUPS_SEND_STATUS_EMAILS === "true",
  };
}
