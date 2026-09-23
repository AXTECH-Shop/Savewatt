import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function ClientNewAlias({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  redirect({ href: "/new", locale });
}
