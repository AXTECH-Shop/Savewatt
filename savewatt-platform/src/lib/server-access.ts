import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  scopeForRole,
  type AppRole,
  type WorkspaceActor,
} from "./access-control";
import { AccountAccessRepository } from "./access/account-access-repository";

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

  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  if (!email) throw new WorkspaceAccessError("EMAIL_REQUIRED");

  const accessRepository = new AccountAccessRepository();
  const membership = await accessRepository.findActiveMembership(userId);
  if (!membership) throw new WorkspaceAccessError("ACCESS_PENDING");

  const internalAccessAllowed = await accessRepository.isInternalUserWhitelisted(
    email,
    membership,
  );
  if (!internalAccessAllowed) throw new WorkspaceAccessError("INTERNAL_NOT_WHITELISTED");

  return {
    userId,
    displayName: user?.fullName ?? user?.firstName ?? "Utilisateur SaveWatt",
    email,
    role: membership.role,
    orgId: membership.organizationId,
    orgName: membership.organizationName,
    orgPath: membership.organizationPath,
    scope: scopeForRole(membership.role),
    isPreview: false,
  };
}

export class WorkspaceAccessError extends Error {
  constructor(
    public readonly code:
      | "ACCESS_PENDING"
      | "EMAIL_REQUIRED"
      | "INTERNAL_NOT_WHITELISTED",
  ) {
    super(code);
    this.name = "WorkspaceAccessError";
  }
}

export async function requirePageRole(allowed: AppRole[]): Promise<WorkspaceActor> {
  const actor = await resolveServerActor();
  if (serverDemoMode) return actor;
  if (actor.role !== "SUPER_ADMIN" && !allowed.includes(actor.role)) notFound();
  return actor;
}
