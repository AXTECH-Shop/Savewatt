import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { NotificationRepository } from "@/lib/notifications/notification-repository";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";
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

  const unreadNotifications = await unreadNotificationCount(actor);

  return (
    <WorkspaceProvider actor={actor}>
      <AppShell unreadNotifications={unreadNotifications}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
