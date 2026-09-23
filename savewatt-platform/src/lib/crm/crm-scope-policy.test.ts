import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppRole, WorkspaceActor } from "../access-control";
import { CrmError } from "./crm-errors.ts";
import { CrmScopePolicy } from "./crm-scope-policy.ts";

function actor(role: AppRole): WorkspaceActor {
  return {
    userId: "user-1",
    displayName: "User One",
    email: "user@example.test",
    role,
    orgId: "org-team",
    orgName: "Team",
    orgPath: "org.root.team",
    scope: role === "SUPER_ADMIN" ? "PLATFORM" : role === "APPORTEUR" ? "OWNED" : "SELF_DESCENDANTS",
    isPreview: false,
  };
}

describe("CrmScopePolicy", () => {
  const policy = new CrmScopePolicy();

  it("allows the platform administrator to query all CRM resources", () => {
    assert.deepEqual(policy.resourcePredicate(actor("SUPER_ADMIN"), "resource_org", "item.owner_user_id"), {
      sql: "1 = 1",
      bindings: [],
    });
  });

  it("limits branch administrators to their materialized path", () => {
    assert.deepEqual(policy.resourcePredicate(actor("MASTER_ADMIN"), "resource_org", "item.owner_user_id"), {
      sql: "(resource_org.path = ? OR resource_org.path LIKE ?)",
      bindings: ["org.root.team", "org.root.team.%"],
    });
  });

  it("limits apporteurs to records they own in their organization", () => {
    assert.deepEqual(policy.resourcePredicate(actor("APPORTEUR"), "resource_org", "item.owner_user_id"), {
      sql: "resource_org.id = ? AND item.owner_user_id = ?",
      bindings: ["org-team", "user-1"],
    });
  });

  it("fails closed for client and finance roles", () => {
    for (const role of ["CLIENT", "OPERATOR_FINANCE"] as const) {
      assert.throws(
        () => policy.resourcePredicate(actor(role), "resource_org", "item.owner_user_id"),
        (error) => error instanceof CrmError && error.code === "CRM_FORBIDDEN",
      );
    }
  });
});
