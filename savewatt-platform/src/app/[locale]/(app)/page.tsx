import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { homeForRole } from "@/lib/access-control";
import { resolveServerActor } from "@/lib/server-access";

export default async function WorkspaceHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const actor = await resolveServerActor();
  redirect({ href: homeForRole(actor.role), locale });
}
