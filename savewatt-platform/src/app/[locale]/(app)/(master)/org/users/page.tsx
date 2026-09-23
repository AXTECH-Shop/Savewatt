import { getTranslations } from "next-intl/server";
import { BranchAccessManager } from "@/components/access/branch-access-manager";
import { PageHeader } from "@/components/workspace/page-header";
import { OrganizationManager } from "@/lib/access-management/organization-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function UsersPage() {
  const t = await getTranslations("organization.users");
  const actor = await resolveServerActor();
  const snapshot = actor.isPreview
    ? { organizations: [], members: [], invitations: [] }
    : await new OrganizationManager().accessSnapshot(actor);

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <BranchAccessManager {...snapshot} preview={actor.isPreview} />
    </div>
  );
}
