import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { NotificationRepository } from "@/lib/notifications/notification-repository";
import {
  ADMIN_ORIGIN,
  APP_ORIGIN,
  isInternalRole,
  resolveAccessSurface,
} from "@/lib/access/access-surface";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";
import { listPreviewTargets } from "@/lib/access/role-preview";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function unreadNotificationCount(actor: { orgId: string; userId: string; isPreview: boolean }) {
  if (actor.isPreview) return 0;
  try {
    return await new NotificationRepository().unreadCount(actor.orgId, actor.userId);
  } catch {
    return 0;
  }
}

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
  const realRole = actor.preview?.realRole ?? actor.role;
  if (surface === "ADMIN" && !isInternalRole(realRole)) {
    redirect(`${APP_ORIGIN}/${locale}`);
  }
  if (surface === "APP" && isInternalRole(realRole)) {
    redirect(`${ADMIN_ORIGIN}/${locale}`);
  }

  const unreadNotifications = await unreadNotificationCount(actor);
  const previewTargets = realRole === "SUPER_ADMIN" ? await listPreviewTargets() : [];

  return (
    <WorkspaceProvider actor={actor} previewTargets={previewTargets}>
      <AppShell unreadNotifications={unreadNotifications}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
