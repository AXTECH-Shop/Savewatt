import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  isAppRole,
  scopeForRole,
  type AppRole,
  type WorkspaceActor,
} from "./access-control";

const serverDemoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";

export async function resolveServerActor(): Promise<WorkspaceActor> {
  if (serverDemoMode) {
    return {
      userId: "demo-apporteur",
      displayName: "Nicolas Bernard",
      email: "nicolas.bernard@savewatt.fr",
      role: "APPORTEUR",
      orgId: "team-paris-ouest",
      orgName: "Équipe Paris Ouest",
      orgPath: "axtech.ile_de_france.paris_ouest",
      scope: "OWNED",
      isPreview: true,
    };
  }

  const { userId, orgId, orgSlug } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");

  const user = await currentUser();
  const metadata = user?.publicMetadata ?? {};
  const role = isAppRole(metadata.savewattRole) ? metadata.savewattRole : "APPORTEUR";
  const orgPath =
    typeof metadata.orgPath === "string" ? metadata.orgPath : `axtech.${orgSlug ?? "personal"}`;
  const orgName = typeof metadata.orgName === "string" ? metadata.orgName : "Espace SaveWatt";

  return {
    userId,
    displayName: user?.fullName ?? user?.firstName ?? "Utilisateur SaveWatt",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    role,
    orgId: orgId ?? "personal",
    orgName,
    orgPath,
    scope: scopeForRole(role),
    isPreview: false,
  };
}

export async function requirePageRole(allowed: AppRole[]): Promise<WorkspaceActor> {
  const actor = await resolveServerActor();
  if (serverDemoMode) return actor;
  if (actor.role !== "SUPER_ADMIN" && !allowed.includes(actor.role)) notFound();
  return actor;
}
