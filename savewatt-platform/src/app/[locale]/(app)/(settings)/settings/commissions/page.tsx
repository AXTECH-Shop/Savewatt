import { getTranslations } from "next-intl/server";
import { requirePageRole, resolveServerActor } from "@/lib/server-access";
import { CommissionRateRepository } from "@/lib/commissions/commission-rate-repository";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { CommissionRatesManager } from "@/components/settings/commission-rates-manager";

export default async function CommissionSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const actor = await resolveServerActor();
  const t = await getTranslations("commissionRates");
  const tree = actor.isPreview
    ? { rootId: actor.orgId, nodes: [] }
    : await new CommissionRateRepository().listTree(actor);

  return (
    <div className="rise">
      <SettingsNav />
      <PageHeader eyebrow={t("eyebrow")} title={t("settingsTitle")} description={t("settingsDescription")} />
      <CommissionRatesManager tree={tree} isOperator={actor.role === "SUPER_ADMIN"} editable preview={actor.isPreview} />
    </div>
  );
}
