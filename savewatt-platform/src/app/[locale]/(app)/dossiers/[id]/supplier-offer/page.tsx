import { SupplierOfferForm } from "@/components/dossiers/supplier-offer-form";
import { SupplierOfferWorkspace } from "@/components/dossiers/supplier-offer-workspace";
import { OfferManager } from "@/lib/offers/offer-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function SupplierOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveServerActor();

  if (actor.isPreview) {
    return <SupplierOfferForm dossierId={id} />;
  }

  const initialOffer = await new OfferManager().getSupplierOffer(actor, id);
  return <SupplierOfferWorkspace dossierId={id} initialOffer={initialOffer} />;
}
