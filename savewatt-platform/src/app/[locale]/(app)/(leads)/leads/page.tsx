import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { CrmManager } from "@/lib/crm/crm-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function LeadsPage() {
  const t = await getTranslations("leads");
  const actor = await resolveServerActor();

  if (actor.isPreview) {
    return (
      <div className="rise">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        <p className="mt-6 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
          {t("previewUnavailable")}
        </p>
      </div>
    );
  }

  const leads = await new CrmManager().listLeads(actor, null);
  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <LeadsWorkspace initialLeads={leads} />
    </div>
  );
}
