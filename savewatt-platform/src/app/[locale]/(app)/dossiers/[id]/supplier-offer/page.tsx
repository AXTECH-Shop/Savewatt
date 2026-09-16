import { SupplierOfferForm } from "@/components/dossiers/supplier-offer-form";

export default async function SupplierOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierOfferForm dossierId={id} />;
}
