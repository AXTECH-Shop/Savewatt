import { CalendarCheck, ClockCountdown, Warning } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const renewals = [
  { client: "Atelier Vaugirard", end: "18 déc. 2026", window: "J-93", owner: "Nicolas Bernard", state: "À préparer" },
  { client: "Boulangerie Lamarck", end: "02 nov. 2026", window: "J-47", owner: "Inès Lemaire", state: "Urgent" },
  { client: "Logis Rive Gauche", end: "14 janv. 2027", window: "J-120", owner: "Inès Lemaire", state: "Planifié" },
  { client: "Médicentre Boulogne", end: "06 mars 2029", window: "J-901", owner: "Solène Caron", state: "Actif" },
];

export default function RenewalCalendarPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Échéancier" title="Anticiper les renouvellements" description="Les alertes J-180, J-90 et J-30 donnent à chaque responsable le temps de préparer une nouvelle proposition." />
      <MetricStrip items={[
        { label: "Sous 30 jours", value: "0" },
        { label: "Sous 90 jours", value: "1", tone: "warning" },
        { label: "Sous 180 jours", value: "3" },
        { label: "Tâches planifiées", value: "4", tone: "positive" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[1.2fr_0.8fr_0.65fr_0.9fr_0.7fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint sm:grid"><span>Client</span><span>Fin de contrat</span><span>Fenêtre</span><span>Responsable</span><span>État</span></div><ul className="divide-y divide-line">{renewals.map((renewal) => <li key={renewal.client} className="grid gap-3 px-5 py-5 sm:grid-cols-[1.2fr_0.8fr_0.65fr_0.9fr_0.7fr] sm:items-center"><span className="flex items-center gap-3"><span className="text-accent">{renewal.state === "Urgent" ? <Warning size={19} weight="fill" /> : renewal.state === "Actif" ? <CalendarCheck size={19} /> : <ClockCountdown size={19} />}</span><strong className="text-sm text-ink">{renewal.client}</strong></span><span className="text-sm text-muted">{renewal.end}</span><span className="font-mono text-xs text-muted">{renewal.window}</span><span className="text-sm text-muted">{renewal.owner}</span><span><StatusPill tone={renewal.state === "Urgent" ? "warning" : renewal.state === "Actif" ? "positive" : "neutral"}>{renewal.state}</StatusPill></span></li>)}</ul></section>
    </div>
  );
}
