import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  normalizeRole,
  scopeForRole,
  type AppRole,
  type WorkspaceActor,
} from "./access-control";
import { AccountAccessRepository } from "./access/account-access-repository";
import { applyRolePreview, ROLE_PREVIEW_COOKIE } from "./access/role-preview";

const serverDemoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";

export async function resolveServerActor(options: { ignorePreview?: boolean } = {}): Promise<WorkspaceActor> {
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

  const displayName = user?.fullName ?? user?.firstName ?? "Utilisateur Zack AI";

  const accessRepository = new AccountAccessRepository();
  const membership = await accessRepository.findOrProvisionWhitelistedMembership({
    clerkUserId: userId,
    email,
    displayName,
  });
  if (!membership) throw new WorkspaceAccessError("ACCESS_PENDING");

  const internalAccessAllowed = await accessRepository.isInternalUserWhitelisted(
    email,
    membership,
  );
  if (!internalAccessAllowed) throw new WorkspaceAccessError("INTERNAL_NOT_WHITELISTED");

  const role = normalizeRole(membership.role);
  const actor: WorkspaceActor = {
    userId,
    displayName,
    email,
    role,
    orgId: membership.organizationId,
    orgName: membership.organizationName,
    orgPath: membership.organizationPath,
    scope: scopeForRole(role),
    isPreview: false,
  };
  if (role !== "SUPER_ADMIN" || options.ignorePreview) return actor;
  const previewOrganizationId = (await cookies()).get(ROLE_PREVIEW_COOKIE)?.value;
  return previewOrganizationId ? applyRolePreview(actor, previewOrganizationId) : actor;
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
