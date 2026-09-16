import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import {
  ADMIN_ORIGIN,
  APP_ORIGIN,
  isInternalRole,
  resolveAccessSurface,
} from "@/lib/access/access-surface";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let actor;

  try {
    actor = await resolveServerActor();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      redirect(`/${locale}/access-pending`);
    }
    throw error;
  }

  const surface = resolveAccessSurface((await headers()).get("host"));
  if (surface === "ADMIN" && !isInternalRole(actor.role)) {
    redirect(`${APP_ORIGIN}/${locale}`);
  }
  if (surface === "APP" && isInternalRole(actor.role)) {
    redirect(`${ADMIN_ORIGIN}/${locale}`);
  }

  return (
    <WorkspaceProvider actor={actor}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
