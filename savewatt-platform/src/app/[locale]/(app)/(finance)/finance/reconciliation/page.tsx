import { Check, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const anomalies = [
  { contract: "Atelier Vaugirard", pdl: "50092118403427", expected: "8.14 MWh", received: "7.61 MWh", variance: "−6.5%", reason: "lowerVolume" },
  { contract: "Hôtel Opéra Lafayette", pdl: "50074296183015", expected: "14.89 MWh", received: "—", variance: "missing", reason: "missingLine" },
] as const;

export default async function ReconciliationPage() {
  const t = await getTranslations("finance");

  return (
    <div className="rise">
      <PageHeader eyebrow={t("financialControl")} title={t("consumptionReconciliation")} description={t("consumptionReconciliationDescription")} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-semibold text-ink">{t("variancesToResolve")}</h2><p className="mt-1 text-sm text-muted">{t("reconciliationPeriod")}</p></div><StatusPill tone="warning">{t("anomalyCount")}</StatusPill></div>
        <ul className="divide-y divide-line">{anomalies.map((item) => <li key={item.pdl} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.65fr_auto] lg:items-center"><div className="flex items-start gap-3"><span className="mt-0.5 text-warning"><WarningCircle size={20} weight="fill" /></span><span><strong className="block text-sm text-ink">{item.contract}</strong><span className="font-mono text-xs text-muted">{item.pdl}</span></span></div><span><small className="block text-xs text-faint">{t("expected")}</small><strong className="nums text-sm text-ink">{item.expected}</strong></span><span><small className="block text-xs text-faint">{t("received")}</small><strong className="nums text-sm text-ink">{item.received === "—" ? "—" : item.received}</strong></span><span><small className="block text-xs text-faint">{t("variance")}</small><strong className="nums text-sm text-warning">{item.variance === "missing" ? t("missing") : item.variance}</strong></span><button className="press inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line-strong px-3 text-xs font-medium text-ink"><Check size={15} />{t("resolve")}</button></li>)}</ul>
      </section>
      <section className="mt-6 rounded-2xl border border-accent/20 bg-accent-soft p-5"><h2 className="font-semibold text-accent-ink">{t("reconciledContracts")}</h2><p className="mt-1 text-sm text-accent-ink/75">{t("reconciledContractsDescription")}</p></section>
    </div>
  );
}
