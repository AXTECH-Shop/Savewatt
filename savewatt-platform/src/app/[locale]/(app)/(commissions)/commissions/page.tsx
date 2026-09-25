import { getTranslations } from "next-intl/server";
import { resolveServerActor } from "@/lib/server-access";
import { CommissionRateRepository } from "@/lib/commissions/commission-rate-repository";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/workspace/page-header";
import { CommissionRatesManager } from "@/components/settings/commission-rates-manager";

export default async function CommissionsPage() {
  const actor = await resolveServerActor();
  const t = await getTranslations("commissionRates");
  const tree = actor.isPreview
    ? { rootId: actor.orgId, nodes: [] }
    : await new CommissionRateRepository().listTree(actor);
  const canConfigure = ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role);

  return (
    <div className="rise">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("overviewTitle")}
        description={t("overviewDescription")}
        action={
          canConfigure ? (
            <Link
              href="/settings/commissions"
              className="press inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink"
            >
              {t("configure")}
            </Link>
          ) : undefined
        }
      />
      <CommissionRatesManager tree={tree} isOperator={actor.role === "SUPER_ADMIN"} editable={false} preview={actor.isPreview} />
    </div>
  );
}
