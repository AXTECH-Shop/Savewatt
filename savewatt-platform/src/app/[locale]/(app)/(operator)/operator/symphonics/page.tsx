import { FileCsv, Info, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const mapping = [
  ["PDL", "pdl", "validationPdl"],
  ["Cadran", "cadran", "validationCadran"],
  ["Electron_EUR_MWh", "electronEurMwh", "validationDecimal"],
  ["Volume_MWh", "annualVolumeMwh", "validationDecimal"],
  ["Validite", "validUntil", "validationIsoDate"],
] as const;

export default async function SymphonicsSettingsPage() {
  const t = await getTranslations("operator");

  return (
    <div className="rise">
      <PageHeader eyebrow={t("supplierConnector")} title={t("symphonicsManualIntegration")} description={t("symphonicsManualIntegrationDescription")} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">{t("columnMapping")}</h2><p className="mt-1 text-sm text-muted">{t("columnMappingDescription")}</p></div><StatusPill tone="warning">{t("manual")}</StatusPill></div><div className="mt-5 overflow-hidden rounded-xl border border-line"><table className="w-full text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint"><tr><th className="px-4 py-3 font-medium">{t("sourceColumn")}</th><th className="px-4 py-3 font-medium">{t("savewattField")}</th><th className="px-4 py-3 font-medium">{t("validation")}</th></tr></thead><tbody className="divide-y divide-line">{mapping.map(([source, target, validation]) => <tr key={source}><td className="px-4 py-3 font-mono text-xs text-ink">{source}</td><td className="px-4 py-3 font-mono text-xs text-accent">{target}</td><td className="px-4 py-3 text-muted">{t(validation)}</td></tr>)}</tbody></table></div></section>
        <aside className="space-y-5"><section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileCsv size={24} /></span><h2 className="mt-4 font-semibold text-ink">{t("testRateFile")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("testRateFileDescription")}</p><button className="press mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink"><UploadSimple size={17} />{t("chooseCsv")}</button></section><section className="flex gap-3 rounded-2xl border border-accent/20 bg-accent-soft p-4 text-sm text-accent-ink"><Info size={20} className="mt-0.5 shrink-0" /><p>{t("supplierApiNotice")}</p></section></aside>
      </div>
    </div>
  );
}
