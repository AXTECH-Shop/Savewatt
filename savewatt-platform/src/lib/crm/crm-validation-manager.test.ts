import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CrmError } from "./crm-errors.ts";
import { CrmValidationManager } from "./crm-validation-manager.ts";

describe("CrmValidationManager", () => {
  const manager = new CrmValidationManager();

  it("normalizes a valid dossier input", () => {
    assert.deepEqual(
      manager.createDossier({
        legalName: "  Atelier Exemple  ",
        siren: "123 456 789",
        contactEmail: "CLIENT@EXAMPLE.FR",
        pdl: "12 345 678 901 234",
        segment: "C4",
      }),
      {
        legalName: "Atelier Exemple",
        siren: "123456789",
        contactName: undefined,
        contactEmail: "client@example.fr",
        contactPhone: undefined,
        pdl: "12345678901234",
        segment: "C4",
        source: undefined,
        notes: undefined,
      },
    );
  });

  it("rejects invalid identifiers and email addresses", () => {
    for (const input of [
      { legalName: "Example", siren: "123", segment: "C4" },
      { legalName: "Example", contactEmail: "invalid", segment: "C4" },
      { legalName: "Example", pdl: "123", segment: "C4" },
    ]) {
      assert.throws(
        () => manager.createDossier(input),
        (error) => error instanceof CrmError && error.code === "CRM_INVALID_INPUT",
      );
    }
  });

  it("requires a task to belong to a client or dossier", () => {
    assert.throws(
      () => manager.createTask({ title: "Call customer" }),
      (error) => error instanceof CrmError && error.field === "dossierId",
    );
  });
});
