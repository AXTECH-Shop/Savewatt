import { ArrowRight, CheckCircle, FileText, Lightning, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const timeline = [
  { label: "Facture reçue", detail: "12 septembre 2026", done: true },
  { label: "Comparatif préparé", detail: "Économie estimée : 2 511 € / an", done: true },
  { label: "Offre à consulter", detail: "Valable jusqu’au 16 septembre 2026", done: false },
  { label: "Signature", detail: "Disponible après validation de l’offre", done: false },
];

export default function CustomerDashboardPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Espace client" title="Votre proposition d’électricité" description="Retrouvez les écarts utiles, les conditions proposées et l’avancement de votre contrat dans un seul espace." />
      <MetricStrip items={[
        { label: "Économie estimée", value: "2 511 € / an", tone: "positive" },
        { label: "Durée proposée", value: "2 ans" },
        { label: "Site", value: "Paris 18e" },
        { label: "Statut", value: "À consulter", tone: "warning" },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-5 py-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-ink">Votre comparatif</h2><StatusPill tone="positive">Prêt</StatusPill></div><p className="mt-1 text-sm text-muted">À consommation et périmètre comparables.</p></div>
          <div className="grid gap-6 p-5 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">Contrat actuel</p><p className="nums mt-3 text-2xl font-semibold text-ink">190,95 €/MWh</p><p className="mt-1 text-sm text-muted">Heures pleines été</p></div><div className="border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">Proposition SaveWatt</p><p className="nums mt-3 text-2xl font-semibold text-accent">92,77 €/MWh</p><p className="mt-1 text-sm text-muted">Prix final comparable</p></div></div>
          <div className="border-t border-line bg-surface-2 p-5"><Link href="/dossiers/josh-sample/proposal" className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white">Consulter l’offre complète <ArrowRight size={16} /></Link></div>
        </section>
        <aside className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">Avancement</p><ol className="mt-5 space-y-5">{timeline.map((step, index) => <li key={step.label} className="relative flex gap-3">{index < timeline.length - 1 && <span className="absolute left-[0.7rem] top-6 h-[calc(100%+0.25rem)] w-px bg-white/15" />}<span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-lime text-deep" : "border border-white/25 bg-white/5 text-white/55"}`}>{step.done ? <CheckCircle size={15} weight="fill" /> : index + 1}</span><span><strong className="block text-sm font-medium">{step.label}</strong><span className="mt-1 block text-xs leading-5 text-white/60">{step.detail}</span></span></li>)}</ol></aside>
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-line bg-surface p-5"><Lightning size={22} className="text-accent" /><h2 className="mt-4 font-semibold text-ink">Prix expliqués</h2><p className="mt-2 text-sm leading-6 text-muted">Les postes comparés et les écarts sont présentés sans exposer les éléments internes.</p></article><article className="rounded-2xl border border-line bg-surface p-5"><FileText size={22} className="text-accent" /><h2 className="mt-4 font-semibold text-ink">Documents centralisés</h2><p className="mt-2 text-sm leading-6 text-muted">Facture, proposition et contrat restent disponibles dans votre espace.</p></article><article className="rounded-2xl border border-line bg-surface p-5"><SealCheck size={22} className="text-accent" /><h2 className="mt-4 font-semibold text-ink">Signature sécurisée</h2><p className="mt-2 text-sm leading-6 text-muted">La signature électronique est ouverte quand votre offre est prête.</p></article></section>
    </div>
  );
}
