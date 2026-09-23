import {
  BellRinging,
  CheckCircle,
  FileText,
  PenNib,
} from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";

const notifications = [
  {
    icon: PenNib,
    titleKey: "signaturePending",
    bodyKey: "signaturePendingBody",
    client: "Hôtel Opéra Lafayette",
    timeKey: "eighteenMinutesAgo",
    unread: true,
  },
  {
    icon: FileText,
    titleKey: "extractionComplete",
    bodyKey: "extractionCompleteBody",
    client: "Boulangerie Lamarck",
    timeKey: "fortySixMinutesAgo",
    unread: true,
  },
  {
    icon: CheckCircle,
    titleKey: "commissionValidated",
    bodyKey: "commissionValidatedBody",
    client: "Médicentre Boulogne",
    amountEur: 123.08,
    timeKey: "yesterday",
    unread: false,
  },
];

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const locale = await getLocale();
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  });
  return (
    <div className="rise max-w-4xl">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          <button className="press h-10 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink">
            {t("markAllRead")}
          </button>
        }
      />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {notifications.map(({ icon: Icon, ...item }) => (
            <li
              key={item.titleKey}
              className={`flex gap-4 px-5 py-5 ${item.unread ? "bg-accent-soft/35" : ""}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.unread ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold text-ink">
                    {t(item.titleKey)}
                  </h2>
                  <span className="shrink-0 text-xs text-faint">
                    {t(item.timeKey)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t(item.bodyKey, {
                    client: item.client,
                    amount:
                      typeof item.amountEur === "number"
                        ? currency.format(item.amountEur)
                        : "",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-center border-t border-line px-5 py-4 text-sm text-muted">
          <BellRinging size={17} className="mr-2" /> {t("preferencesNote")}
        </div>
      </section>
    </div>
  );
}
