import { getTranslations } from "next-intl/server";
import { OrganizationTreeManager } from "@/components/access/organization-tree-manager";
import { PageHeader } from "@/components/workspace/page-header";
import { OrganizationManager } from "@/lib/access-management/organization-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function OrganizationPage() {
  const t = await getTranslations("organization");
  const actor = await resolveServerActor();
  const organizations = actor.isPreview ? [] : await new OrganizationManager().list(actor);
  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <OrganizationTreeManager organizations={organizations} preview={actor.isPreview} />
    </div>
  );
}
