import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CrmError } from "../crm/crm-errors.ts";
import { DocumentValidationManager } from "./document-validation-manager.ts";

describe("DocumentValidationManager", () => {
  const manager = new DocumentValidationManager();

  it("accepts supported document signatures", () => {
    assert.doesNotThrow(() =>
      manager.magicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), "application/pdf"),
    );
    assert.doesNotThrow(() =>
      manager.magicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"),
    );
  });

  it("rejects a spoofed MIME type", () => {
    assert.throws(
      () => manager.magicBytes(new TextEncoder().encode("not a pdf"), "application/pdf"),
      (error) => error instanceof CrmError && error.field === "fileContent",
    );
  });

  it("normalizes user supplied file names", () => {
    assert.equal(manager.safeFileName(" Facture client été 2026.pdf "), "Facture-client-ete-2026.pdf");
    assert.equal(manager.safeFileName("../../"), "document");
  });
});

