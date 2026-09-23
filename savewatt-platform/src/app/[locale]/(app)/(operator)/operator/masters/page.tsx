import { Plus, TreeStructure } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { demoOrganizations } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default async function MastersPage() {
  const t = await getTranslations("operator");
  const locale = await getLocale();
  const masters = demoOrganizations.filter((org) => org.type === "MASTER");
  const number = new Intl.NumberFormat(locale);

  return (
    <div className="rise">
      <PageHeader eyebrow={t("network")} title={t("mainRegies")} description={t("mainRegiesDescription")} action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Plus size={16} />{t("newRegie")}</button>} />
      <MetricStrip items={[
        { label: t("regies"), value: String(masters.length) },
        { label: t("activeMembers"), value: String(masters.reduce((sum, item) => sum + item.activeMembers, 0)) },
        { label: t("openFiles"), value: String(masters.reduce((sum, item) => sum + item.openDeals, 0)) },
        { label: t("monthlyVolume"), value: `${number.format(masters.reduce((sum, item) => sum + item.monthlyMwh, 0))} MWh`, tone: "positive" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[1.35fr_0.65fr_0.65fr_0.8fr_0.65fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint md:grid"><span>{t("organization")}</span><span>{t("members")}</span><span>{t("files")}</span><span>{t("volumePerMonth")}</span><span>{t("status")}</span></div><ul className="divide-y divide-line">{masters.map((master) => <li key={master.id} className="grid gap-3 px-5 py-5 hover:bg-surface-2 md:grid-cols-[1.35fr_0.65fr_0.65fr_0.8fr_0.65fr] md:items-center"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-deep text-lime"><TreeStructure size={18} /></span><span><strong className="block text-sm text-ink">{master.name}</strong><span className="font-mono text-[11px] text-faint">{master.path}</span></span></span><span className="nums text-sm text-muted">{master.activeMembers}</span><span className="nums text-sm text-muted">{master.openDeals}</span><span className="nums text-sm text-muted">{number.format(master.monthlyMwh)} MWh</span><span><StatusPill tone="positive">{t("active")}</StatusPill></span></li>)}</ul></section>
    </div>
  );
}
