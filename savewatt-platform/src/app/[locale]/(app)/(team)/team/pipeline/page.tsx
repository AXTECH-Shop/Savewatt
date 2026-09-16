import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { demoDeals } from "@/lib/demo-workspace";

export default function TeamPipelinePage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Équipe Paris Ouest" title="Pipeline de l’équipe" description="Repérez les dossiers bloqués, réaffectez une action et gardez les échéances commerciales visibles." />
      <MetricStrip items={[
        { label: "Dossiers ouverts", value: String(demoDeals.filter((deal) => !["signed", "lost"].includes(deal.status)).length) },
        { label: "À relancer", value: "2", tone: "warning" },
        { label: "En signature", value: String(demoDeals.filter((deal) => deal.status === "sent").length) },
        { label: "Signés ce mois", value: String(demoDeals.filter((deal) => deal.status === "signed").length), tone: "positive" },
      ]} />
      <PipelineBoard scope="team" />
    </div>
  );
}
