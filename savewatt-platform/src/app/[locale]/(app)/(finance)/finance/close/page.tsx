import { ArrowClockwise, CheckCircle, Clock, Play } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const steps = [
  { name: "Contrôler les consommations", detail: "42 contrats rapprochés", state: "done" },
  { name: "Calculer la marge réseau", detail: "Base électron + CEE + capacité", state: "done" },
  { name: "Distribuer les commissions", detail: "AX TECH, masters et descendants", state: "pending" },
  { name: "Préparer la facture consolidée", detail: "Factur-X + annexe par contrat", state: "waiting" },
];

export default function MonthlyClosePage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Finance opérateur" title="Clôture mensuelle" description="Rapprochez les volumes, calculez la marge et préparez les commissions dans un run relançable et auditable." action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Play size={16} weight="fill" /> Lancer la clôture</button>} />
      <MetricStrip items={[
        { label: "Période", value: "08 / 2026", detail: "Clôture en préparation" },
        { label: "Contrats attendus", value: "44" },
        { label: "Volumes rapprochés", value: "1 842 MWh", tone: "positive" },
        { label: "Anomalies", value: "2", detail: "à résoudre avant émission", tone: "warning" },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">Run d’août 2026</h2><p className="mt-1 text-sm text-muted">Dernière mise à jour il y a 12 minutes.</p></div><StatusPill tone="warning">En attente</StatusPill></div>
          <ol className="mt-6 divide-y divide-line">
            {steps.map((step, index) => <li key={step.name} className="flex items-start gap-4 py-5 first:pt-0 last:pb-0"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${step.state === "done" ? "bg-accent text-white" : step.state === "pending" ? "bg-warning-soft text-warning" : "bg-surface-2 text-faint"}`}>{step.state === "done" ? <CheckCircle size={19} weight="fill" /> : step.state === "pending" ? <Clock size={19} /> : <span className="font-mono text-xs">{index + 1}</span>}</span><div className="flex-1"><p className="font-medium text-ink">{step.name}</p><p className="mt-1 text-sm text-muted">{step.detail}</p></div>{step.state === "pending" && <button className="press inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-medium text-ink"><ArrowClockwise size={15} /> Relancer</button>}</li>)}
          </ol>
        </section>
        <aside className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">Prochaine étape</p><h2 className="mt-3 text-xl font-semibold">Résoudre deux écarts de consommation.</h2><p className="mt-3 text-sm leading-6 text-white/68">La facture consolidée reste bloquée tant qu’un volume manque ou ne correspond pas au contrat connu.</p><a href="reconciliation" className="press mt-6 inline-flex h-10 items-center rounded-lg bg-lime px-4 text-sm font-semibold text-deep">Ouvrir le rapprochement</a></aside>
      </div>
    </div>
  );
}
