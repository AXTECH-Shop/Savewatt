import { CalendarCheck, ClockCountdown, Warning } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const renewals = [
  { client: "Atelier Vaugirard", end: "2026-12-18", window: "J-93", owner: "Nicolas Bernard", state: "toPrepare" },
  { client: "Boulangerie Lamarck", end: "2026-11-02", window: "J-47", owner: "Inès Lemaire", state: "urgent" },
  { client: "Logis Rive Gauche", end: "2027-01-14", window: "J-120", owner: "Inès Lemaire", state: "planned" },
  { client: "Médicentre Boulogne", end: "2029-03-06", window: "J-901", owner: "Solène Caron", state: "active" },
] as const;

export default async function RenewalCalendarPage() {
  const t = await getTranslations("schedule");
  const locale = await getLocale();
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <MetricStrip items={[
        { label: t("within30Days"), value: "0" },
        { label: t("within90Days"), value: "1", tone: "warning" },
        { label: t("within180Days"), value: "3" },
        { label: t("plannedTasks"), value: "4", tone: "positive" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[1.2fr_0.8fr_0.65fr_0.9fr_0.7fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint sm:grid"><span>{t("client")}</span><span>{t("contractEnd")}</span><span>{t("window")}</span><span>{t("owner")}</span><span>{t("status")}</span></div><ul className="divide-y divide-line">{renewals.map((renewal) => <li key={renewal.client} className="grid gap-3 px-5 py-5 sm:grid-cols-[1.2fr_0.8fr_0.65fr_0.9fr_0.7fr] sm:items-center"><span className="flex items-center gap-3"><span className="text-accent">{renewal.state === "urgent" ? <Warning size={19} weight="fill" /> : renewal.state === "active" ? <CalendarCheck size={19} /> : <ClockCountdown size={19} />}</span><strong className="text-sm text-ink">{renewal.client}</strong></span><span className="text-sm text-muted">{date.format(new Date(`${renewal.end}T00:00:00Z`))}</span><span className="font-mono text-xs text-muted">{renewal.window}</span><span className="text-sm text-muted">{renewal.owner}</span><span><StatusPill tone={renewal.state === "urgent" ? "warning" : renewal.state === "active" ? "positive" : "neutral"}>{t(renewal.state)}</StatusPill></span></li>)}</ul></section>
    </div>
  );
}
