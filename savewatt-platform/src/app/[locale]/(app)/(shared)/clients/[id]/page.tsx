import { ArrowLeft, ArrowRight, Buildings, EnvelopeSimple, Gauge, Lightning } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { demoDeals } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = demoDeals.find((item) => item.id === id);
  if (!deal) notFound();
  return (
    <div className="rise">
      <Link href="/pipeline" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> Retour au pipeline</Link>
      <PageHeader eyebrow={`${deal.segment} · PDL ${deal.pdl}`} title={deal.client} description={`Dossier suivi par ${deal.owner}. La prochaine action est visible avec les données du site et de l’offre.`} action={<StatusPill tone={deal.status === "signed" ? "positive" : "warning"}>{deal.nextAction}</StatusPill>} />
      <MetricStrip items={[
        { label: "Consommation annuelle", value: `${deal.annualConsumptionMwh.toLocaleString("fr-FR")} MWh` },
        { label: "Économie estimée", value: deal.annualSavingEur ? `${deal.annualSavingEur.toLocaleString("fr-FR")} € / an` : "À calculer", tone: deal.annualSavingEur ? "positive" : "warning" },
        { label: "Échéance", value: deal.dueLabel },
        { label: "Responsable", value: deal.owner },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]"><section className="rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><h2 className="font-semibold text-ink">Site et contrat</h2></div><div className="grid gap-5 p-5 sm:grid-cols-2"><div className="flex gap-3"><Buildings size={20} className="mt-0.5 text-accent" /><div><p className="text-xs uppercase tracking-[0.08em] text-faint">Établissement</p><p className="mt-1 text-sm font-medium text-ink">{deal.client}</p></div></div><div className="flex gap-3"><Lightning size={20} className="mt-0.5 text-accent" /><div><p className="text-xs uppercase tracking-[0.08em] text-faint">Point de livraison</p><p className="nums mt-1 text-sm font-medium text-ink">{deal.pdl}</p></div></div><div className="flex gap-3"><Gauge size={20} className="mt-0.5 text-accent" /><div><p className="text-xs uppercase tracking-[0.08em] text-faint">Segment</p><p className="mt-1 text-sm font-medium text-ink">{deal.segment}</p></div></div><div className="flex gap-3"><EnvelopeSimple size={20} className="mt-0.5 text-accent" /><div><p className="text-xs uppercase tracking-[0.08em] text-faint">Contact</p><p className="mt-1 text-sm font-medium text-ink">contact@{deal.client.toLowerCase().replaceAll(" ", "-").replace(/[^a-z-]/g, "")}.fr</p></div></div></div></section><aside className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">Prochaine action</p><h2 className="mt-3 text-xl font-semibold">{deal.nextAction}</h2><p className="mt-3 text-sm leading-6 text-white/68">Échéance : {deal.dueLabel}. Ouvrez le dossier commercial pour contrôler les données et poursuivre le parcours.</p><Link href={`/dossiers/${deal.id}`} className="press mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-semibold text-deep">Ouvrir le dossier <ArrowRight size={16} /></Link></aside></div>
    </div>
  );
}
