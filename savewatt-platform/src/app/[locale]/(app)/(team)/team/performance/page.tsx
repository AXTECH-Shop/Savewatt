import { Medal, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { teamMembers } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";

export default function TeamPerformancePage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Performance équipe" title="Suivre sans mettre les marges en concurrence." description="Comparez l’activité, la conversion et les commissions propres à l’équipe, sans révéler la rémunération des autres branches." />
      <MetricStrip items={[
        { label: "Opportunités", value: "26" },
        { label: "Contrats signés", value: "12" },
        { label: "Conversion", value: "39,6 %", tone: "positive" },
        { label: "Commission équipe", value: "723,10 €" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[auto_1.25fr_0.65fr_0.75fr_0.8fr_0.8fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint md:grid"><span>#</span><span>Commercial</span><span>Dossiers</span><span>Signés</span><span>Conversion</span><span>Commission</span></div><ol className="divide-y divide-line">{teamMembers.map((member, index) => <li key={member.name} className="grid gap-3 px-5 py-5 md:grid-cols-[auto_1.25fr_0.65fr_0.75fr_0.8fr_0.8fr] md:items-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-semibold ${index === 0 ? "bg-lime text-deep" : "bg-surface-2 text-muted"}`}>{index === 0 ? <Medal size={17} weight="fill" /> : index + 1}</span><span><strong className="block text-sm text-ink">{member.name}</strong><span className="text-xs text-muted">{member.role}</span></span><span className="nums text-sm text-muted">{member.deals}</span><span className="nums text-sm text-muted">{member.signed}</span><span className="nums flex items-center gap-1.5 text-sm font-medium text-accent"><TrendUp size={15} />{member.conversion.toLocaleString("fr-FR")} %</span><span className="nums text-sm font-semibold text-ink">{member.commissionEur.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span></li>)}</ol></section>
    </div>
  );
}
