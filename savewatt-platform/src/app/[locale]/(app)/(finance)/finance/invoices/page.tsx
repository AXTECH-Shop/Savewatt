import { DownloadSimple, FilePdf, Plus } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const invoices = [
  { number: "SW-2026-008", period: "Août 2026", total: "18 426,72 €", contracts: 42, state: "Brouillon" },
  { number: "SW-2026-007", period: "Juillet 2026", total: "16 984,18 €", contracts: 39, state: "Émise" },
  { number: "SW-2026-006", period: "Juin 2026", total: "15 772,44 €", contracts: 36, state: "Payée" },
];

export default function InvoicesPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Facturation consolidée" title="Factures Symphonics" description="Une séquence continue, un document Factur-X et une annexe qui relie chaque montant à son contrat." action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Plus size={16} /> Préparer la facture</button>} />
      <MetricStrip items={[
        { label: "À émettre", value: "18 426,72 €", tone: "warning" },
        { label: "Émis cette année", value: "109 384 €" },
        { label: "Réglé", value: "90 957 €", tone: "positive" },
        { label: "Délai moyen", value: "18 j" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[0.8fr_1fr_0.8fr_0.7fr_0.7fr_auto] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint md:grid"><span>Numéro</span><span>Période</span><span>Total HT</span><span>Contrats</span><span>Statut</span><span></span></div><ul className="divide-y divide-line">{invoices.map((invoice) => <li key={invoice.number} className="grid gap-3 px-5 py-5 md:grid-cols-[0.8fr_1fr_0.8fr_0.7fr_0.7fr_auto] md:items-center"><span className="flex items-center gap-2 font-mono text-xs font-medium text-ink"><FilePdf size={18} className="text-accent" />{invoice.number}</span><span className="text-sm text-muted">{invoice.period}</span><span className="nums text-sm font-semibold text-ink">{invoice.total}</span><span className="nums text-sm text-muted">{invoice.contracts}</span><span><StatusPill tone={invoice.state === "Payée" ? "positive" : invoice.state === "Brouillon" ? "warning" : "neutral"}>{invoice.state}</StatusPill></span><button className="press rounded-lg p-2 text-muted hover:bg-surface-2" aria-label={`Télécharger ${invoice.number}`}><DownloadSimple size={18} /></button></li>)}</ul></section>
    </div>
  );
}
