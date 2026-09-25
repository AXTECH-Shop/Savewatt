import { getTranslations } from "next-intl/server";
import { requirePageRole, resolveServerActor } from "@/lib/server-access";
import { WorkflowRepository } from "@/lib/workflows/workflow-repository";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflows/workflow-stages";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { WorkflowEditor } from "@/components/settings/workflow-editor";

export default async function WorkflowSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const actor = await resolveServerActor();
  const t = await getTranslations("workflowSettings");
  const repository = actor.isPreview ? null : new WorkflowRepository();
  const [effective, history] = repository
    ? await Promise.all([repository.resolveEffective(actor), repository.history(actor)])
    : [{ stages: DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage })), version: null, inherited: true }, []];

  return (
    <div className="rise">
      <SettingsNav />
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <WorkflowEditor effective={effective} history={history} preview={actor.isPreview} />
    </div>
  );
}
