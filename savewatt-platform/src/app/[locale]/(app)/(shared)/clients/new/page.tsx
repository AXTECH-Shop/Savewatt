import { redirect } from "@/i18n/navigation";

export default async function ClientNewAlias({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/new", locale });
}
