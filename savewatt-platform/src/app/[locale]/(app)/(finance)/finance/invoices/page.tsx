import { DownloadSimple, FilePdf, Plus } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const invoices = [
  { number: "SW-2026-008", period: "invoicePeriodAugust", total: "€18,426.72", contracts: 42, state: "draft" },
  { number: "SW-2026-007", period: "invoicePeriodJuly", total: "€16,984.18", contracts: 39, state: "issued" },
  { number: "SW-2026-006", period: "invoicePeriodJune", total: "€15,772.44", contracts: 36, state: "paid" },
] as const;

export default async function InvoicesPage() {
  const t = await getTranslations("finance");

  return (
    <div className="rise">
      <PageHeader eyebrow={t("consolidatedBilling")} title={t("symphonicsInvoices")} description={t("symphonicsInvoicesDescription")} action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Plus size={16} />{t("prepareInvoice")}</button>} />
      <MetricStrip items={[
        { label: t("toIssue"), value: "€18,426.72", tone: "warning" },
        { label: t("issuedThisYear"), value: "€109,384" },
        { label: t("settled"), value: "€90,957", tone: "positive" },
        { label: t("averageDelay"), value: t("averageDelayValue") },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[0.8fr_1fr_0.8fr_0.7fr_0.7fr_auto] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint md:grid"><span>{t("number")}</span><span>{t("period")}</span><span>{t("totalExTax")}</span><span>{t("contracts")}</span><span>{t("status")}</span><span /></div><ul className="divide-y divide-line">{invoices.map((invoice) => <li key={invoice.number} className="grid gap-3 px-5 py-5 md:grid-cols-[0.8fr_1fr_0.8fr_0.7fr_0.7fr_auto] md:items-center"><span className="flex items-center gap-2 font-mono text-xs font-medium text-ink"><FilePdf size={18} className="text-accent" />{invoice.number}</span><span className="text-sm text-muted">{t(invoice.period)}</span><span className="nums text-sm font-semibold text-ink">{invoice.total}</span><span className="nums text-sm text-muted">{invoice.contracts}</span><span><StatusPill tone={invoice.state === "paid" ? "positive" : invoice.state === "draft" ? "warning" : "neutral"}>{t(`invoice${invoice.state[0].toUpperCase()}${invoice.state.slice(1)}`)}</StatusPill></span><button className="press rounded-lg p-2 text-muted hover:bg-surface-2" aria-label={t("downloadInvoice", { number: invoice.number })}><DownloadSimple size={18} /></button></li>)}</ul></section>
    </div>
  );
}
