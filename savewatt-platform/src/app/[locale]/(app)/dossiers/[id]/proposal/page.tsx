import { getTranslations } from "next-intl/server";
import { DemoProposalPage } from "@/components/dossiers/demo-proposal-page";
import { OfferWorkspace } from "@/components/dossiers/offer-workspace";
import { OfferManager } from "@/lib/offers/offer-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveServerActor();

  if (actor.isPreview) {
    return <DemoProposalPage />;
  }

  const t = await getTranslations("offerWorkspace");
  const manager = new OfferManager();
  const [supplierOffer, marginGrid, offerVersions] = await Promise.all([
    manager.getSupplierOffer(actor, id),
    manager.resolveMarginGrid(actor),
    manager.listOfferVersions(actor, id),
  ]);

  return (
    <div className="rise">
      <OfferWorkspace
        dossierId={id}
        supplierOffer={supplierOffer}
        marginGrid={marginGrid}
        offerVersions={offerVersions}
      />
      {!supplierOffer && <p className="mt-4 text-sm text-muted">{t("missingSupplierOffer")}</p>}
      {!marginGrid && <p className="mt-4 text-sm text-muted">{t("missingMarginGrid")}</p>}
    </div>
  );
}
