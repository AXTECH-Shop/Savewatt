import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { PipelineQueryManager } from "@/lib/crm/pipeline-query-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function TeamPipelinePage() {
  const t = await getTranslations("team.pipeline");
  const actor = await resolveServerActor();
  const deals = await new PipelineQueryManager().list(actor);
  return (
    <div className="rise">
      <PageHeader eyebrow="Équipe Paris Ouest" title={t("title")} description={t("description")} />
      <MetricStrip items={[
        { label: t("openFiles"), value: String(deals.filter((deal) => !["signed", "lost"].includes(deal.status)).length) },
        { label: t("toFollowUp"), value: String(deals.filter((deal) => deal.dueAt !== null).length), tone: "warning" },
        { label: t("signing"), value: String(deals.filter((deal) => deal.status === "sent").length) },
        { label: t("signedThisMonth"), value: String(deals.filter((deal) => deal.status === "signed").length), tone: "positive" },
      ]} />
      <PipelineBoard deals={deals} />
    </div>
  );
}
