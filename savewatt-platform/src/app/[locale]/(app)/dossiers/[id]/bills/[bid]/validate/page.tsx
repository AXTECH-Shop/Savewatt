import { getTranslations } from "next-intl/server";
import { BillValidationWorkspace } from "@/components/dossiers/bill-validation-workspace";
import { ExtractionValidationForm } from "@/components/dossiers/extraction-validation-form";
import { DocumentRepository } from "@/lib/documents/document-repository";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { ExtractionRepository } from "@/lib/extraction/extraction-repository";
import { resolveServerActor } from "@/lib/server-access";

export default async function BillValidationPage({ params }: { params: Promise<{ id: string; bid: string }> }) {
  const { id, bid } = await params;
  const actor = await resolveServerActor();

  if (actor.isPreview) {
    return <BillValidationWorkspace dossierId={id} billId={bid} />;
  }

  const t = await getTranslations("extractionValidation");
  const [document, dossier, extractions] = await Promise.all([
    new DocumentRepository().find(actor, bid),
    new DossierRepository().find(actor, id),
    new ExtractionRepository().listForDocument(actor, bid),
  ]);
  const extraction = extractions[0];

  if (!document || !dossier || !extraction) {
    return (
      <div className="rise">
        <p className="py-20 text-center text-muted">{t("notFound")}</p>
      </div>
    );
  }

  const source = extraction.validated ?? extraction.result;
  return (
    <ExtractionValidationForm
      dossierId={id}
      dossierVersion={dossier.version}
      extractionId={extraction.id}
      bill={source.bill}
      warnings={extraction.result.warnings}
    />
  );
}
