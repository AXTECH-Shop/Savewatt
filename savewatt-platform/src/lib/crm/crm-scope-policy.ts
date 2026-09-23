import type { WorkspaceActor } from "@/lib/access-control";
import { CrmError } from "./crm-errors.ts";

export interface ScopePredicate {
  sql: string;
  bindings: string[];
}

const BRANCH_ROLES = [
  "MASTER_ADMIN",
  "MASTER_BACKOFFICE",
  "SUB_REGIE_ADMIN",
] as const;

const WRITE_ROLES = [
  "SUPER_ADMIN",
  "MASTER_ADMIN",
  "MASTER_BACKOFFICE",
  "SUB_REGIE_ADMIN",
  "TEAM_MANAGER",
  "APPORTEUR",
] as const;

export class CrmScopePolicy {
  assertCanRead(actor: WorkspaceActor): void {
    if (actor.role === "CLIENT" || actor.role === "OPERATOR_FINANCE") {
      throw new CrmError("CRM_FORBIDDEN", 403);
    }
  }

  assertCanWrite(actor: WorkspaceActor): void {
    if (!WRITE_ROLES.includes(actor.role as (typeof WRITE_ROLES)[number])) {
      throw new CrmError("CRM_FORBIDDEN", 403);
    }
  }

  resourcePredicate(
    actor: WorkspaceActor,
    organizationAlias: string,
    ownerColumn: string,
  ): ScopePredicate {
    this.assertCanRead(actor);

    if (actor.role === "SUPER_ADMIN") {
      return { sql: "1 = 1", bindings: [] };
    }

    if (BRANCH_ROLES.includes(actor.role as (typeof BRANCH_ROLES)[number])) {
      return {
        sql: `(${organizationAlias}.path = ? OR ${organizationAlias}.path LIKE ?)` ,
        bindings: [actor.orgPath, `${actor.orgPath}.%`],
      };
    }

    if (actor.role === "APPORTEUR") {
      return {
        sql: `${organizationAlias}.id = ? AND ${ownerColumn} = ?`,
        bindings: [actor.orgId, actor.userId],
      };
    }

    return {
      sql: `${organizationAlias}.id = ?`,
      bindings: [actor.orgId],
    };
  }
}
