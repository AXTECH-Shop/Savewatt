import { DownloadSimple, Info } from "@phosphor-icons/react/dist/ssr";
import { demoCommissionLines } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const label = { forecast: "À venir", vesting: "En validation", available: "Disponible", paid: "Versée", clawback: "Reprise" };
const tone = { forecast: "neutral", vesting: "warning", available: "positive", paid: "positive", clawback: "danger" } as const;

export default function CommissionsPage() {
  const available = demoCommissionLines.filter((line) => line.status === "available").reduce((sum, line) => sum + line.amountEur, 0);
  const upcoming = demoCommissionLines.filter((line) => ["forecast", "vesting"].includes(line.status)).reduce((sum, line) => sum + line.amountEur, 0);
  return (
    <div className="rise">
      <PageHeader eyebrow="Rémunération" title="Commissions contrat par contrat" description="Chaque montant reste relié au volume consommé, à la règle appliquée et à son état de validation." action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink"><DownloadSimple size={17} /> Exporter</button>} />
      <MetricStrip items={[
        { label: "Disponible", value: `${available.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, tone: "positive" },
        { label: "À venir", value: `${upcoming.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` },
        { label: "Déjà versé", value: "178,32 €" },
        { label: "Contrats contributeurs", value: String(demoCommissionLines.length) },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[1.2fr_0.85fr_0.65fr_0.7fr_0.7fr_0.7fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint lg:grid"><span>Contrat</span><span>Période</span><span>Volume</span><span>Base</span><span>Montant</span><span>État</span></div><ul className="divide-y divide-line">{demoCommissionLines.map((line) => <li key={line.id} className="grid gap-3 px-5 py-5 lg:grid-cols-[1.2fr_0.85fr_0.65fr_0.7fr_0.7fr_0.7fr] lg:items-center"><span><strong className="block text-sm text-ink">{line.contract}</strong><span className="text-xs text-muted">{line.beneficiary}</span></span><span className="text-sm text-muted">{line.period}</span><span className="nums text-sm text-muted">{line.volumeMwh.toLocaleString("fr-FR")} MWh</span><span className="nums text-sm text-muted">{line.basisEurMwh.toLocaleString("fr-FR")} €/MWh</span><span className="nums text-sm font-semibold text-ink">{line.amountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span><span><StatusPill tone={tone[line.status]}>{label[line.status]}</StatusPill></span></li>)}</ul></section>
      <div className="mt-5 flex gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted"><Info size={19} className="mt-0.5 shrink-0 text-accent" /><p>Cette vue n’affiche que votre rémunération et les contrats de votre périmètre. Les marges des niveaux parents ou des autres apporteurs ne sont jamais exposées.</p></div>
    </div>
  );
}
