import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function OfferRedirect({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  redirect({ href: `/dossiers/${id}/proposal`, locale });
}
