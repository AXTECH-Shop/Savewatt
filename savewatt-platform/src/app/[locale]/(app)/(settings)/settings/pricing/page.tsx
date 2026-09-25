import { getTranslations } from "next-intl/server";
import { requirePageRole, resolveServerActor } from "@/lib/server-access";
import { PricingParameterRepository } from "@/lib/offers/pricing-parameter-repository";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PricingParametersForm } from "@/components/settings/pricing-parameters-form";

export default async function PricingSettingsPage() {
  // Pass-through rates (CEE, capa, accise, CTA, TVA, TURPE) are operator-internal.
  await requirePageRole(["SUPER_ADMIN"]);
  const actor = await resolveServerActor();
  const t = await getTranslations("settings");
  const effective = actor.isPreview
    ? null
    : await new PricingParameterRepository().resolveEffective(actor);

  return (
    <div className="rise">
      <SettingsNav />
      <PageHeader
        eyebrow={t("settings")}
        title={t("pricingSettings")}
        description={t("pricingSettingsDescription")}
      />
      <PricingParametersForm effective={effective} preview={actor.isPreview} />
    </div>
  );
}
