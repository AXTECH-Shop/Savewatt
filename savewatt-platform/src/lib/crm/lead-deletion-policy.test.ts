import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppRole, WorkspaceActor } from "../access-control";
import { CrmError } from "./crm-errors.ts";
import { assertCanDelete, deletionBlocker } from "./lead-deletion-policy.ts";

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

const clean = { leadStatus: "CONVERTED", dossierStatus: "proposalReady", completedSignatures: 0, commissionLines: 0 };

describe("lead deletion policy", () => {
  it("lets branch administrators delete", () => {
    for (const role of ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"] as AppRole[]) {
      assert.doesNotThrow(() => assertCanDelete(actor(role)));
    }
  });

  it("refuses apporteurs, finance, read-only and clients", () => {
    for (const role of ["APPORTEUR", "OPERATOR_FINANCE", "READ_ONLY", "CLIENT", "TEAM_MANAGER"] as AppRole[]) {
      assert.throws(() => assertCanDelete(actor(role)), (error) => error instanceof CrmError && error.status === 403);
    }
  });

  it("allows unconverted leads and unsigned dossiers", () => {
    assert.equal(deletionBlocker({ ...clean, leadStatus: "NEW", dossierStatus: null }), null);
    assert.equal(deletionBlocker(clean), null);
    assert.equal(deletionBlocker({ ...clean, dossierStatus: "sent" }), null);
  });

  it("blocks signed dossiers, commissions and in-flight conversions", () => {
    assert.equal(deletionBlocker({ ...clean, dossierStatus: "signed" }), "SIGNED");
    assert.equal(deletionBlocker({ ...clean, completedSignatures: 1 }), "SIGNED");
    assert.equal(deletionBlocker({ ...clean, commissionLines: 2 }), "COMMISSIONS");
    assert.equal(deletionBlocker({ ...clean, leadStatus: "CONVERTING" }), "CONVERTING");
  });
});
