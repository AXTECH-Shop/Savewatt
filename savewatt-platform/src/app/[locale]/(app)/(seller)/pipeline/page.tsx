import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { DemoSeedButton } from "@/components/dossiers/demo-seed-button";
import { PipelineQueryManager } from "@/lib/crm/pipeline-query-manager";
import { resolveServerActor } from "@/lib/server-access";
import { WorkflowRepository } from "@/lib/workflows/workflow-repository";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflows/workflow-stages";

export default async function PersonalPipelinePage() {
  const t = await getTranslations("seller.pipeline");
  const locale = await getLocale();
  const actor = await resolveServerActor();
  const deals = await new PipelineQueryManager().list(actor);
  const stages = actor.isPreview
    ? DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage }))
    : (await new WorkflowRepository().resolveEffective(actor)).stages;
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} action={actor.isPreview ? <DemoSeedButton /> : undefined} />
      <MetricStrip items={[
        { label: t("toProcess"), value: String(deals.filter((deal) => ["draft", "uploaded", "analyzed"].includes(deal.status)).length), tone: "warning" },
        { label: t("readyOffers"), value: String(deals.filter((deal) => deal.status === "proposalReady").length) },
        { label: t("signing"), value: String(deals.filter((deal) => deal.status === "sent").length) },
        { label: t("proposedAnnualGain"), value: currency.format(deals.reduce((sum, deal) => sum + (deal.annualSavingEur ?? 0), 0)), tone: "positive" },
      ]} />
      <PipelineBoard deals={deals} stages={stages} />
    </div>
  );
}
