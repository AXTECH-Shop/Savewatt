import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CrmError } from "./crm-errors.ts";
import { DossierStatusManager } from "./dossier-status-manager.ts";

describe("DossierStatusManager", () => {
  const manager = new DossierStatusManager();

  it("allows operational transitions before proposal delivery", () => {
    assert.doesNotThrow(() => manager.assertTransition("draft", "uploaded"));
    assert.doesNotThrow(() => manager.assertTransition("uploaded", "analyzed"));
    assert.doesNotThrow(() => manager.assertTransition("analyzed", "proposalReady"));
  });

  it("does not let CRM endpoints simulate signing", () => {
    assert.throws(
      () => manager.assertTransition("proposalReady", "signed"),
      (error) => error instanceof CrmError && error.code === "CRM_CONFLICT",
    );
  });
});
