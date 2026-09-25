import type { AppRole, WorkspaceActor } from "@/lib/access-control";
import type { OrganizationKind } from "./access-types";

const CHILD_KINDS: Record<OrganizationKind, OrganizationKind[]> = {
  OPERATOR: ["MASTER"],
  MASTER: ["SUB_REGIE"],
  SUB_REGIE: [],
  TEAM: [],
};

const INVITABLE_ROLES: Record<OrganizationKind, AppRole[]> = {
  OPERATOR: [],
  MASTER: ["MASTER_ADMIN", "APPORTEUR"],
  SUB_REGIE: ["SUB_REGIE_ADMIN", "APPORTEUR"],
  TEAM: ["APPORTEUR"],
};

export class AccessScopePolicy {
  organizationInScope(actor: WorkspaceActor, path: string): boolean {
    return (
      actor.role === "SUPER_ADMIN" ||
      path === actor.orgPath ||
      path.startsWith(`${actor.orgPath}.`)
    );
  }

  canCreateChild(
    actor: WorkspaceActor,
    parentPath: string,
    parentKind: OrganizationKind,
    childKind: OrganizationKind,
  ): boolean {
    if (!["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role)) return false;
    return this.organizationInScope(actor, parentPath) && CHILD_KINDS[parentKind].includes(childKind);
  }

  canInvite(actor: WorkspaceActor, organizationPath: string, kind: OrganizationKind, role: AppRole) {
    if (!["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role)) return false;
    return this.organizationInScope(actor, organizationPath) && INVITABLE_ROLES[kind].includes(role);
  }
}
