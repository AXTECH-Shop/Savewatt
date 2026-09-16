import { FileCsv, Info, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const mapping = [
  ["PDL", "pdl", "Texte · 14 chiffres"], ["Cadran", "cadran", "HPH / HCH / HPE / HCE"], ["Electron_EUR_MWh", "electronEurMwh", "Nombre décimal"], ["Volume_MWh", "annualVolumeMwh", "Nombre décimal"], ["Validite", "validUntil", "Date ISO"],
];

export default function SymphonicsSettingsPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Connecteur fournisseur" title="Intégration manuelle Symphonics" description="Le flux v1 importe une feuille tarifaire contrôlée. L’API future reprendra exactement le même schéma." />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">Correspondance des colonnes</h2><p className="mt-1 text-sm text-muted">Format attendu pour chaque proposition fournisseur.</p></div><StatusPill tone="warning">Manuel</StatusPill></div>
          <div className="mt-5 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint"><tr><th className="px-4 py-3 font-medium">Colonne source</th><th className="px-4 py-3 font-medium">Champ SaveWatt</th><th className="px-4 py-3 font-medium">Validation</th></tr></thead><tbody className="divide-y divide-line">{mapping.map(([source, target, validation]) => <tr key={source}><td className="px-4 py-3 font-mono text-xs text-ink">{source}</td><td className="px-4 py-3 font-mono text-xs text-accent">{target}</td><td className="px-4 py-3 text-muted">{validation}</td></tr>)}</tbody></table>
          </div>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileCsv size={24} /></span><h2 className="mt-4 font-semibold text-ink">Tester un fichier tarifaire</h2><p className="mt-2 text-sm leading-6 text-muted">Prévisualisez les lignes et les erreurs sans créer d’offre.</p><button className="press mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink"><UploadSimple size={17} /> Choisir un CSV</button></section>
          <section className="flex gap-3 rounded-2xl border border-accent/20 bg-accent-soft p-4 text-sm text-accent-ink"><Info size={20} className="mt-0.5 shrink-0" /><p>L’absence d’API fournisseur est explicite. Aucun import ne sera présenté comme synchronisé automatiquement.</p></section>
        </aside>
      </div>
    </div>
  );
}
