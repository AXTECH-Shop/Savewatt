import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkspaceActor } from "@/lib/access-control";
import { AccessScopePolicy } from "./access-scope-policy.ts";

const actor: WorkspaceActor = {
  userId: "user-1",
  displayName: "Admin",
  email: "admin@example.com",
  role: "MASTER_ADMIN",
  orgId: "master-1",
  orgName: "Master",
  orgPath: "operator.master_1",
  scope: "SELF_DESCENDANTS",
  isPreview: false,
};

describe("AccessScopePolicy", () => {
  const policy = new AccessScopePolicy();

  it("allows hierarchy changes only below the actor branch", () => {
    assert.equal(policy.canCreateChild(actor, actor.orgPath, "MASTER", "SUB_REGIE"), true);
    assert.equal(policy.canCreateChild(actor, actor.orgPath, "MASTER", "TEAM"), false);
    assert.equal(policy.canCreateChild(actor, "operator.master_2", "MASTER", "SUB_REGIE"), false);
    assert.equal(policy.canCreateChild(actor, actor.orgPath, "MASTER", "MASTER"), false);
  });

  it("binds roles to compatible organization levels", () => {
    assert.equal(policy.canInvite(actor, `${actor.orgPath}.team`, "TEAM", "APPORTEUR"), true);
    assert.equal(policy.canInvite(actor, `${actor.orgPath}.team`, "TEAM", "MASTER_ADMIN"), false);
  });
});
