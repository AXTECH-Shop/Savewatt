import { redirect } from "@/i18n/navigation";
import { homeForRole } from "@/lib/access-control";
import { resolveServerActor } from "@/lib/server-access";

export default async function WorkspaceHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const actor = await resolveServerActor();
  redirect({ href: homeForRole(actor.role), locale });
}
