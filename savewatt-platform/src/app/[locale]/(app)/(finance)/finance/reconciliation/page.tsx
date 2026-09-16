import { Check, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const anomalies = [
  { contract: "Atelier Vaugirard", pdl: "50092118403427", expected: "8,14 MWh", received: "7,61 MWh", variance: "−6,5 %", reason: "Volume inférieur" },
  { contract: "Hôtel Opéra Lafayette", pdl: "50074296183015", expected: "14,89 MWh", received: "—", variance: "Manquant", reason: "Ligne absente" },
];

export default function ReconciliationPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Contrôle financier" title="Rapprochement des consommations" description="Comparez le relevé fournisseur aux volumes attendus avant de calculer les commissions." />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-semibold text-ink">Écarts à traiter</h2><p className="mt-1 text-sm text-muted">Période d’août 2026</p></div><StatusPill tone="warning">2 anomalies</StatusPill></div>
        <ul className="divide-y divide-line">{anomalies.map((item) => <li key={item.pdl} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.65fr_auto] lg:items-center"><div className="flex items-start gap-3"><span className="mt-0.5 text-warning"><WarningCircle size={20} weight="fill" /></span><span><strong className="block text-sm text-ink">{item.contract}</strong><span className="font-mono text-xs text-muted">{item.pdl}</span></span></div><span><small className="block text-xs text-faint">Attendu</small><strong className="nums text-sm text-ink">{item.expected}</strong></span><span><small className="block text-xs text-faint">Reçu</small><strong className="nums text-sm text-ink">{item.received}</strong></span><span><small className="block text-xs text-faint">Écart</small><strong className="nums text-sm text-warning">{item.variance}</strong></span><button className="press inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line-strong px-3 text-xs font-medium text-ink"><Check size={15} /> Résoudre</button></li>)}</ul>
      </section>
      <section className="mt-6 rounded-2xl border border-accent/20 bg-accent-soft p-5"><h2 className="font-semibold text-accent-ink">42 contrats sont déjà rapprochés</h2><p className="mt-1 text-sm text-accent-ink/75">Les lignes validées sont figées pour ce run et restent rattachées à leur source d’import.</p></section>
    </div>
  );
}
