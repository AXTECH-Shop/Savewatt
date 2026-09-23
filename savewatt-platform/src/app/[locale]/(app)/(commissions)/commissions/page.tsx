import { DownloadSimple, Info } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { demoCopyKey, demoPeriodKeys } from "@/lib/demo-copy";
import { demoCommissionLines } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const tone = { forecast: "neutral", vesting: "warning", available: "positive", paid: "positive", clawback: "danger" } as const;

export default async function CommissionsPage() {
  const t = await getTranslations("commissions");
  const locale = await getLocale();
  const available = demoCommissionLines.filter((line) => line.status === "available").reduce((sum, line) => sum + line.amountEur, 0);
  const upcoming = demoCommissionLines.filter((line) => ["forecast", "vesting"].includes(line.status)).reduce((sum, line) => sum + line.amountEur, 0);
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
  const number = new Intl.NumberFormat(locale);

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink"><DownloadSimple size={17} />{t("export")}</button>} />
      <MetricStrip items={[
        { label: t("available"), value: currency.format(available), tone: "positive" },
        { label: t("upcoming"), value: currency.format(upcoming) },
        { label: t("alreadyPaid"), value: currency.format(178.32) },
        { label: t("contributingContracts"), value: String(demoCommissionLines.length) },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="hidden grid-cols-[1.2fr_0.85fr_0.65fr_0.7fr_0.7fr_0.7fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint lg:grid"><span>{t("contract")}</span><span>{t("period")}</span><span>{t("volume")}</span><span>{t("basis")}</span><span>{t("amount")}</span><span>{t("state")}</span></div>
        <ul className="divide-y divide-line">
          {demoCommissionLines.map((line) => (
            <li key={line.id} className="grid gap-3 px-5 py-5 lg:grid-cols-[1.2fr_0.85fr_0.65fr_0.7fr_0.7fr_0.7fr] lg:items-center">
              <span><strong className="block text-sm text-ink">{line.contract}</strong><span className="text-xs text-muted">{line.beneficiary}</span></span>
              <span className="text-sm text-muted">{t(demoCopyKey(demoPeriodKeys, line.period) ?? "unknownPeriod")}</span>
              <span className="nums text-sm text-muted">{number.format(line.volumeMwh)} MWh</span>
              <span className="nums text-sm text-muted">{currency.format(line.basisEurMwh)}/MWh</span>
              <span className="nums text-sm font-semibold text-ink">{currency.format(line.amountEur)}</span>
              <span><StatusPill tone={tone[line.status]}>{t(`status${line.status[0].toUpperCase()}${line.status.slice(1)}`)}</StatusPill></span>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-5 flex gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted"><Info size={19} className="mt-0.5 shrink-0 text-accent" /><p>{t("privacyNote")}</p></div>
    </div>
  );
}
