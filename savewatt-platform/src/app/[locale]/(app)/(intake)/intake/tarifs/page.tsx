import { getTranslations } from "next-intl/server";
import { ReferenceTermsForm } from "@/components/intake/reference-terms-form";
import { PageHeader } from "@/components/workspace/page-header";
import { ReferenceTermsRepository } from "@/lib/intake/reference-terms-repository";
import { PricingParameterRepository } from "@/lib/offers/pricing-parameter-repository";
import { resolveServerActor } from "@/lib/server-access";

export default async function ReferenceTermsPage() {
  const t = await getTranslations("intake");
  const actor = await resolveServerActor();
  const [current, params] = actor.isPreview
    ? [null, null]
    : await Promise.all([
        new ReferenceTermsRepository().resolveActive(actor),
        new PricingParameterRepository().resolveEffective(actor),
      ]);
  const lastQuote = !actor.isPreview && !current ? await new ReferenceTermsRepository().latestDossierQuote(actor) : null;

  return (
    <div className="rise">
      <PageHeader eyebrow={t("admin.title")} title={t("reference.title")} description={t("reference.description")} />
      <ReferenceTermsForm
        current={current}
        prefill={lastQuote}
        passThrough={params ? { ceeEurMwh: params.ceeEurMwh, capacityEurMwh: params.capacityEurMwh } : null}
      />
    </div>
  );
}
