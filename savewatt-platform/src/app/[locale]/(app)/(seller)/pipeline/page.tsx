import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { demoDeals } from "@/lib/demo-workspace";
import { DemoSeedButton } from "@/components/dossiers/demo-seed-button";

export default function PersonalPipelinePage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Mon activité" title="Mes dossiers clients" description="Retrouvez la prochaine action utile pour chaque client, de la facture reçue au contrat signé." action={<DemoSeedButton />} />
      <MetricStrip items={[
        { label: "À traiter", value: String(demoDeals.filter((deal) => ["uploaded", "analyzed"].includes(deal.status)).length), tone: "warning" },
        { label: "Offres prêtes", value: String(demoDeals.filter((deal) => deal.status === "proposalReady").length) },
        { label: "En signature", value: String(demoDeals.filter((deal) => deal.status === "sent").length) },
        { label: "Gain annuel proposé", value: `${demoDeals.reduce((sum, deal) => sum + deal.annualSavingEur, 0).toLocaleString("fr-FR")} €`, tone: "positive" },
      ]} />
      <PipelineBoard scope="personal" />
    </div>
  );
}
