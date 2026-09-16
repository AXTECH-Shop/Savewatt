import { BillValidationWorkspace } from "@/components/dossiers/bill-validation-workspace";

export default async function BillValidationPage({ params }: { params: Promise<{ id: string; bid: string }> }) {
  const { id, bid } = await params;
  return <BillValidationWorkspace dossierId={id} billId={bid} />;
}
