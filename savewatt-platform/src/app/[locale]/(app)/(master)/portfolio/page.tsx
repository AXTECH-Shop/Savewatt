import { ArrowRight, FilePlus } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { demoCommissionLines, demoDeals } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default function PortfolioPage() {
  const open = demoDeals.filter((deal) => !["signed", "lost"].includes(deal.status));
  const commissions = demoCommissionLines.reduce((sum, line) => sum + line.amountEur, 0);
  return (
    <div className="rise">
      <PageHeader eyebrow="Portefeuille régie" title="Une vue claire de votre branche." description="Suivez les signatures, les échéances et les commissions à recevoir sans exposer les marges des autres branches." action={<Link href="/new" className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><FilePlus size={17} /> Nouveau dossier</Link>} />
      <MetricStrip items={[
        { label: "Dossiers ouverts", value: String(open.length), detail: "sur votre branche" },
        { label: "En signature", value: String(demoDeals.filter((deal) => deal.status === "sent").length) },
        { label: "Économie proposée", value: `${demoDeals.reduce((sum, deal) => sum + deal.annualSavingEur, 0).toLocaleString("fr-FR")} €`, tone: "positive" },
        { label: "Commissions suivies", value: `${commissions.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-semibold text-ink">Dossiers à faire avancer</h2><p className="mt-1 text-xs text-muted">Classés par prochaine action.</p></div><Link href="/pipeline" className="text-sm font-medium text-accent">Voir le pipeline</Link></div><ul className="divide-y divide-line">{open.slice(0, 5).map((deal) => <li key={deal.id}><Link href={`/clients/${deal.id}`} className="press grid gap-3 px-5 py-4 hover:bg-surface-2 sm:grid-cols-[1fr_0.85fr_0.8fr_auto] sm:items-center"><span><strong className="block text-sm text-ink">{deal.client}</strong><span className="font-mono text-xs text-muted">{deal.pdl}</span></span><span className="text-sm text-muted">{deal.nextAction}</span><span className="text-sm text-muted">{deal.owner}</span><ArrowRight size={17} className="text-faint" /></Link></li>)}</ul></section>
        <aside className="space-y-6"><section className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">Prochaine échéance</p><h2 className="mt-3 text-xl font-semibold">3 contrats à anticiper sous 90 jours.</h2><p className="mt-3 text-sm leading-6 text-white/68">Préparez les renouvellements avant l’ouverture des fenêtres tarifaires.</p><Link href="/echeancier" className="mt-5 inline-flex text-sm font-semibold text-lime">Voir l’échéancier <ArrowRight className="ml-2" size={16} /></Link></section><section className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-ink">Commission disponible</h2><StatusPill tone="positive">Validée</StatusPill></div><p className="nums mt-4 text-3xl font-semibold tracking-tight text-ink">123,08 €</p><p className="mt-2 text-sm text-muted">Le détail reste relié au contrat et à la période de consommation.</p></section></aside>
      </div>
    </div>
  );
}
