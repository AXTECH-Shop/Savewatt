import { getTranslations } from "next-intl/server";
import { AdminAccessConsole } from "@/components/access/admin-access-console";
import { PageHeader } from "@/components/workspace/page-header";
import { AccessAdminManager } from "@/lib/access-management/access-admin-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function OperatorAccessPage() {
  const t = await getTranslations("operator.access");
  const actor = await resolveServerActor();
  const snapshot = actor.isPreview
    ? { registrations: [], whitelist: [], organizations: [] }
    : await new AccessAdminManager().snapshot(actor);
  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <AdminAccessConsole {...snapshot} preview={actor.isPreview} />
    </div>
  );
}
