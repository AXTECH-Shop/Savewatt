import { ArrowRight, FileMagnifyingGlass, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { demoDeals } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default function ValidationQueuePage() {
  const queue = demoDeals.filter((deal) => ["analyzed", "proposalReady", "signed"].includes(deal.status));
  return (
    <div className="rise">
      <PageHeader eyebrow="Back-office" title="File de validation" description="Contrôlez les données, l’offre et les pièces du signataire avant transmission." />
      <MetricStrip items={[
        { label: "À valider", value: String(queue.length), tone: "warning" },
        { label: "Extraction", value: "1" },
        { label: "Offre", value: "2" },
        { label: "Post-signature", value: "1", tone: "positive" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">{queue.map((deal) => <li key={deal.id}><Link href={`/backoffice/dossiers/${deal.id}`} className="press grid gap-4 px-5 py-5 hover:bg-surface-2 lg:grid-cols-[auto_1.2fr_0.8fr_0.9fr_0.8fr_auto] lg:items-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">{deal.status === "signed" ? <SealCheck size={20} /> : <FileMagnifyingGlass size={20} />}</span><span><strong className="block text-sm text-ink">{deal.client}</strong><span className="font-mono text-xs text-muted">{deal.pdl}</span></span><span className="text-sm text-muted">{deal.owner}</span><span className="text-sm text-muted">{deal.nextAction}</span><span><StatusPill tone={deal.status === "signed" ? "positive" : "warning"}>{deal.status === "signed" ? "Contrat signé" : "Contrôle requis"}</StatusPill></span><ArrowRight size={18} className="text-faint" /></Link></li>)}</ul></section>
    </div>
  );
}
