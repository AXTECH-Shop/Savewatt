import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";
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

  return (
    <WorkspaceProvider actor={actor}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
