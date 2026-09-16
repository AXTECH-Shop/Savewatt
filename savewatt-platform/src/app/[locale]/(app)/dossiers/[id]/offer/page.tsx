import { redirect } from "@/i18n/navigation";

export default async function OfferRedirect({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect({ href: `/dossiers/${id}/proposal`, locale });
}
