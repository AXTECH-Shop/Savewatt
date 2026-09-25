import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";
import { D1Shim } from "./helpers.mjs";

const d1 = new D1Shim();
const { resolveBearerToken, McpAuthError, hashToken } = await import("../src/auth.ts");

const SUPER_USER = "user_3JPotLtdckCliUoQhRlg5PWixte"; // contact@savewatt.fr (local seed)
const ORG = "org_savewatt";
const APPORTEUR_USER = "mcp-test-apporteur";

function insertToken(plaintext, { userId = SUPER_USER, orgId = ORG, scopes = '["*"]', status = "ACTIVE", expiresAt = null } = {}) {
  d1.db
    .prepare(
      `INSERT OR REPLACE INTO api_tokens (id, token_hash, kind, label, owner_user_id, organization_id, scopes_json, status, expires_at)
       VALUES (?, ?, 'PAT', 'test', ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), hashToken(plaintext), userId, orgId, scopes, status, expiresAt);
}

before(() => {
  d1.db
    .prepare(
      `INSERT OR IGNORE INTO memberships (organization_id, user_id, role, status)
       VALUES (?, ?, 'SUPER_ADMIN', 'ACTIVE')`,
    )
    .run(ORG, SUPER_USER);
  d1.db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
       VALUES (?, 'apporteur@mcp.test', 'Test Apporteur', unixepoch(), unixepoch())`,
    )
    .run(APPORTEUR_USER);
  d1.db
    .prepare(
      `INSERT OR IGNORE INTO memberships (organization_id, user_id, role, status)
       VALUES (?, ?, 'APPORTEUR', 'ACTIVE')`,
    )
    .run(ORG, APPORTEUR_USER);

  insertToken("mcp-test-valid");
  insertToken("mcp-test-expired", { expiresAt: 1 });
  insertToken("mcp-test-revoked", { status: "REVOKED" });
  insertToken("mcp-test-wrongrole", { userId: APPORTEUR_USER });
  insertToken("mcp-test-scoped", { scopes: '["dossiers:read"]' });
});

describe("resolveBearerToken", () => {
  it("resolves a valid ACTIVE token to a SUPER_ADMIN actor", async () => {
    const { actor, token } = await resolveBearerToken(d1, "Bearer mcp-test-valid");
    assert.equal(actor.role, "SUPER_ADMIN");
    assert.equal(actor.orgId, ORG);
    assert.equal(actor.userId, SUPER_USER);
    assert.equal(actor.scope, "PLATFORM");
    assert.deepEqual(token.scopes, ["*"]);
  });

  it("rejects an unknown token", async () => {
    await assert.rejects(() => resolveBearerToken(d1, "Bearer nope"), (error) => {
      assert.ok(error instanceof McpAuthError);
      assert.equal(error.code, "TOKEN_INVALID");
      assert.equal(error.status, 401);
      return true;
    });
  });

  it("rejects an expired token", async () => {
    await assert.rejects(() => resolveBearerToken(d1, "Bearer mcp-test-expired"), /TOKEN_INVALID/);
  });

  it("rejects a revoked token", async () => {
    await assert.rejects(() => resolveBearerToken(d1, "Bearer mcp-test-revoked"), /TOKEN_INVALID/);
  });

  it("rejects tokens owned by non-admin roles (admin-first gate, spec §13.1)", async () => {
    await assert.rejects(
      () => resolveBearerToken(d1, "Bearer mcp-test-wrongrole"),
      (error) => {
        assert.equal(error.code, "TOKEN_FORBIDDEN_ROLE");
        assert.equal(error.status, 403);
        return true;
      },
    );
  });

  it("rejects a missing Authorization header", async () => {
    await assert.rejects(() => resolveBearerToken(d1, null), /UNAUTHENTICATED/);
  });

  it("hashToken produces the stored SHA-256 hex", () => {
    const hash = createHash("sha256").update("mcp-test-valid").digest("hex");
    assert.equal(hashToken("mcp-test-valid"), hash);
  });
});
