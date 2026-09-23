import { ArrowClockwise, CheckCircle, Clock, Play } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const steps = [
  ["stepCheckConsumption", "stepCheckConsumptionDetail", "done"],
  ["stepCalculateMargin", "stepCalculateMarginDetail", "done"],
  ["stepDistributeCommissions", "stepDistributeCommissionsDetail", "pending"],
  ["stepPrepareInvoice", "stepPrepareInvoiceDetail", "waiting"],
] as const;

export default async function MonthlyClosePage() {
  const t = await getTranslations("finance");

  return (
    <div className="rise">
      <PageHeader eyebrow={t("operatorFinance")} title={t("monthlyClose")} description={t("monthlyCloseDescription")} action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Play size={16} weight="fill" />{t("runClose")}</button>} />
      <MetricStrip items={[
        { label: t("period"), value: "08 / 2026", detail: t("closeInPreparation") },
        { label: t("expectedContracts"), value: "44" },
        { label: t("reconciledVolumes"), value: "1,842 MWh", tone: "positive" },
        { label: t("anomalies"), value: "2", detail: t("resolveBeforeIssuing"), tone: "warning" },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">{t("augustRun")}</h2><p className="mt-1 text-sm text-muted">{t("updatedMinutesAgo")}</p></div><StatusPill tone="warning">{t("pending")}</StatusPill></div>
          <ol className="mt-6 divide-y divide-line">
            {steps.map(([name, detail, state], index) => <li key={name} className="flex items-start gap-4 py-5 first:pt-0 last:pb-0"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${state === "done" ? "bg-accent text-white" : state === "pending" ? "bg-warning-soft text-warning" : "bg-surface-2 text-faint"}`}>{state === "done" ? <CheckCircle size={19} weight="fill" /> : state === "pending" ? <Clock size={19} /> : <span className="font-mono text-xs">{index + 1}</span>}</span><div className="flex-1"><p className="font-medium text-ink">{t(name)}</p><p className="mt-1 text-sm text-muted">{t(detail)}</p></div>{state === "pending" && <button className="press inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-medium text-ink"><ArrowClockwise size={15} />{t("rerun")}</button>}</li>)}
          </ol>
        </section>
        <aside className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">{t("nextStep")}</p><h2 className="mt-3 text-xl font-semibold">{t("resolveConsumptionGaps")}</h2><p className="mt-3 text-sm leading-6 text-white/68">{t("consolidatedInvoiceBlocked")}</p><a href="reconciliation" className="press mt-6 inline-flex h-10 items-center rounded-lg bg-lime px-4 text-sm font-semibold text-deep">{t("openReconciliation")}</a></aside>
      </div>
    </div>
  );
}
