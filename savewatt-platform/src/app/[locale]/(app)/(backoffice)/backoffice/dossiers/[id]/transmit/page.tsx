import { FileZip, LockKey, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { Button } from "@/components/ui/button";

export default async function TransmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("backoffice");

  return (
    <div className="rise mx-auto max-w-3xl">
      <PageHeader eyebrow={t("supplierTransmission")} title={t("prepareFile")} description={t("transmissionDescription", { id })} />
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileZip size={24} /></span>
          <div>
            <h2 className="text-sm font-semibold text-ink">{t("transmissionPackage")}</h2>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>{t("signedOfferAndContract")}</li>
              <li>{t("referenceBill")}</li>
              <li>{t("workflowEvidence")}</li>
              <li>{t("validationLog")}</li>
            </ul>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning"><LockKey size={16} />{t("supplierTransmissionDisabled")}</div>
        <Button className="mt-5 w-full" disabled><PaperPlaneTilt size={17} />{t("transmit")}</Button>
      </section>
    </div>
  );
}
