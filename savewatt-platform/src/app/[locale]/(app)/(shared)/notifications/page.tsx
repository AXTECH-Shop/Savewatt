import {
  ArrowsLeftRight,
  BellRinging,
  Checks,
  FileText,
  UserList,
} from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MarkReadButton } from "@/components/notifications/mark-read-button";
import type { NotificationType } from "@/lib/notifications/notification-config";
import type { NotificationRecord } from "@/lib/notifications/notification-repository";
import { NotificationRepository } from "@/lib/notifications/notification-repository";
import { resolveServerActor } from "@/lib/server-access";

const TYPE_ICONS: Record<NotificationType, typeof FileText> = {
  TASK_DUE_REMINDER: Checks,
  LEAD_FOLLOWUP_REMINDER: UserList,
  DOSSIER_STATUS_CHANGED: ArrowsLeftRight,
  OFFER_DELIVERY_UPDATE: FileText,
};

function relativeTime(locale: string, createdAt: number): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const elapsedSeconds = Math.round(createdAt - Date.now() / 1000);
  const absolute = Math.abs(elapsedSeconds);
  if (absolute < 3600) return formatter.format(Math.round(elapsedSeconds / 60), "minute");
  if (absolute < 86400) return formatter.format(Math.round(elapsedSeconds / 3600), "hour");
  return formatter.format(Math.round(elapsedSeconds / 86400), "day");
}

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const locale = await getLocale();
  const actor = await resolveServerActor();

  if (actor.isPreview) {
    return (
      <div className="rise max-w-4xl">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        <p className="mt-6 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
          {t("previewUnavailable")}
        </p>
      </div>
    );
  }

  const notifications = await new NotificationRepository().listForUser(actor.orgId, actor.userId);
  const hasUnread = notifications.some((item) => item.readAt === null);

  return (
    <div className="rise max-w-4xl">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={hasUnread ? <MarkReadButton all /> : undefined}
      />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {notifications.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((item) => (
              <NotificationRow key={item.id} item={item} locale={locale} />
            ))}
          </ul>
        )}
        <div className="flex items-center justify-center border-t border-line px-5 py-4 text-sm text-muted">
          <BellRinging size={17} className="mr-2" /> {t("preferencesNote")}
        </div>
      </section>
    </div>
  );
}

function NotificationRow({
  item,
  locale,
}: {
  item: NotificationRecord;
  locale: string;
}) {
  const unread = item.readAt === null;
  const Icon = TYPE_ICONS[item.type] ?? FileText;
  return (
    <li className={`flex gap-4 px-5 py-5 ${unread ? "bg-accent-soft/35" : ""}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unread ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{item.title}</h2>
          <span className="shrink-0 text-xs text-faint">
            {relativeTime(locale, item.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
        {unread && (
          <div className="mt-2">
            <MarkReadButton notificationId={item.id} />
          </div>
        )}
      </div>
    </li>
  );
}
