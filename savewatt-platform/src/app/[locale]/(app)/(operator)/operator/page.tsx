import { ArrowRight, CheckCircle, Clock, Warning } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { auditEvents, demoDeals, demoOrganizations } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default function OperatorDashboard() {
  const masters = demoOrganizations.filter((org) => org.type === "MASTER");
  const activeContracts = demoDeals.filter((deal) => deal.status === "signed").length;
  const forecastSavings = demoDeals.reduce((total, deal) => total + deal.annualSavingEur, 0);

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Pilotage AX TECH"
        title="Le réseau, les contrats et les flux au même endroit."
        description="Suivez les régies, les dossiers à débloquer et les montants à rapprocher avant la prochaine clôture."
        action={<Link href="/operator/masters" className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">Gérer les régies <ArrowRight size={16} /></Link>}
      />
      <MetricStrip items={[
        { label: "Régies actives", value: String(masters.length), detail: "38 utilisateurs réseau" },
        { label: "Dossiers ouverts", value: String(demoDeals.filter((deal) => !["signed", "lost"].includes(deal.status)).length), detail: "5 étapes commerciales" },
        { label: "Contrats actifs", value: String(activeContracts), detail: "Échantillon de démonstration" },
        { label: "Économies proposées", value: `${forecastSavings.toLocaleString("fr-FR")} €`, detail: "annualisées, avant signature", tone: "positive" },
      ]} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><h2 className="font-semibold text-ink">Activité des régies</h2><p className="mt-0.5 text-xs text-muted">Vue consolidée de chaque branche principale.</p></div>
            <Link href="/operator/masters" className="text-sm font-medium text-accent hover:underline">Tout afficher</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint">
                <tr><th className="px-5 py-3 font-medium">Régie</th><th className="px-5 py-3 font-medium">Équipe</th><th className="px-5 py-3 font-medium">Dossiers</th><th className="px-5 py-3 font-medium">MWh / mois</th><th className="px-5 py-3 font-medium">État</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {masters.map((master) => (
                  <tr key={master.id} className="hover:bg-surface-2"><td className="px-5 py-4 font-medium text-ink">{master.name}</td><td className="nums px-5 py-4 text-muted">{master.activeMembers}</td><td className="nums px-5 py-4 text-muted">{master.openDeals}</td><td className="nums px-5 py-4 text-muted">{master.monthlyMwh.toLocaleString("fr-FR")}</td><td className="px-5 py-4"><StatusPill tone="positive">Active</StatusPill></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-deep p-5 text-white">
            <div className="flex items-center justify-between"><h2 className="font-semibold">État des services</h2><StatusPill tone="positive">Opérationnel</StatusPill></div>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex items-center justify-between"><span className="text-white/70">Extraction Gemini</span><span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-lime" /> Disponible</span></li>
              <li className="flex items-center justify-between"><span className="text-white/70">Signature DocuSeal</span><span className="flex items-center gap-1.5"><Clock size={16} className="text-lime" /> Configuration</span></li>
              <li className="flex items-center justify-between"><span className="text-white/70">Rapprochement</span><span className="flex items-center gap-1.5"><Warning size={16} className="text-lime" /> 2 écarts</span></li>
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Dernières actions</h2>
            <ul className="mt-4 divide-y divide-line">
              {auditEvents.slice(0, 3).map((event) => <li key={event.trace} className="py-3 first:pt-0"><p className="text-sm font-medium text-ink">{event.action}</p><p className="mt-1 text-xs text-muted">{event.target} · {event.actor}</p></li>)}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
