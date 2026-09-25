import { getTranslations } from "next-intl/server";
import { ReferenceTermsForm } from "@/components/intake/reference-terms-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/workspace/page-header";
import { ReferenceTermsRepository } from "@/lib/intake/reference-terms-repository";
import { PricingParameterRepository } from "@/lib/offers/pricing-parameter-repository";
import { requirePageRole, resolveServerActor } from "@/lib/server-access";

export default async function SymphonicsSettingsPage() {
  // Symphonics électron buy prices are operator-internal.
  await requirePageRole(["SUPER_ADMIN"]);
  const actor = await resolveServerActor();
  const t = await getTranslations("intake.reference");
  const settings = await getTranslations("settings");
  const repository = actor.isPreview ? null : new ReferenceTermsRepository();
  const [current, params] = repository
    ? await Promise.all([repository.resolveActive(actor), new PricingParameterRepository().resolveEffective(actor)])
    : [null, null];
  const lastQuote = repository && !current ? await repository.latestDossierQuote(actor) : null;

  return (
    <div className="rise">
      <SettingsNav />
      <PageHeader eyebrow={settings("settings")} title={t("title")} description={t("description")} />
      <ReferenceTermsForm
        current={current}
        prefill={lastQuote}
        passThrough={params ? { ceeEurMwh: params.ceeEurMwh, capacityEurMwh: params.capacityEurMwh } : null}
      />
    </div>
  );
}
