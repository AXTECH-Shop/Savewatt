import { getTranslations } from "next-intl/server";
import { requirePageRole, resolveServerActor } from "@/lib/server-access";
import { MarginGridRepository } from "@/lib/offers/margin-grid-repository";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { MarginGridsManager } from "@/components/settings/margin-grids-manager";

export default async function MarginSettingsPage() {
  // Margin grids are operator-internal: régie roles never see grid internals.
  await requirePageRole(["SUPER_ADMIN"]);
  const actor = await resolveServerActor();
  const t = await getTranslations("settings");
  const grids = actor.isPreview ? [] : await new MarginGridRepository().list(actor);

  return (
    <div className="rise">
      <SettingsNav />
      <PageHeader
        eyebrow={t("settings")}
        title={t("marginGrid")}
        description={t("marginGridDescription")}
      />
      <MarginGridsManager organizationId={actor.orgId} grids={grids} preview={actor.isPreview} />
    </div>
  );
}
