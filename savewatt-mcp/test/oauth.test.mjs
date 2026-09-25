import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { D1Shim } from "./helpers.mjs";

const d1 = new D1Shim();
const { verifyClerkJwt, resolveOAuthActor, protectedResourceMetadata } = await import("../src/oauth.ts");
const worker = (await import("../src/index.ts")).default;

const SUPER_USER = "user_3JPotLtdckCliUoQhRlg5PWixte"; // contact@savewatt.fr (local seed, SUPER_ADMIN)

const encoder = new TextEncoder();
const b64url = (bytes) => Buffer.from(bytes).toString("base64url");

async function keyPair(kid) {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid, alg: "RS256", use: "sig" };
  return { privateKey: pair.privateKey, jwks: { keys: [jwk] }, kid };
}

async function signJwt({ privateKey, kid }, claims) {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "RS256", kid, typ: "JWT" })));
  const payload = b64url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoder.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
}

function jwksFetcher(jwks) {
  return async () => Response.json(jwks);
}

const now = Math.floor(Date.now() / 1000);

describe("Clerk OAuth access tokens", () => {
  it("verifies a valid RS256 token and rejects bad issuer, expiry and signature", async () => {
    const issuer = "https://issuer-a.test";
    const key = await keyPair("kid-a");
    const other = await keyPair("kid-a");
    const fetcher = jwksFetcher(key.jwks);

    const good = await signJwt(key, { iss: issuer, sub: SUPER_USER, exp: now + 600, client_id: "claude" });
    const claims = await verifyClerkJwt(good, issuer, fetcher);
    assert.equal(claims.sub, SUPER_USER);

    await assert.rejects(verifyClerkJwt(good, "https://other-issuer.test", jwksFetcher(key.jwks)), { code: "TOKEN_INVALID" });
    const expired = await signJwt(key, { iss: issuer, sub: SUPER_USER, exp: now - 600 });
    await assert.rejects(verifyClerkJwt(expired, issuer, fetcher), { code: "TOKEN_INVALID" });
    const forged = await signJwt(other, { iss: issuer, sub: SUPER_USER, exp: now + 600 });
    await assert.rejects(verifyClerkJwt(forged, issuer, fetcher), { code: "TOKEN_INVALID" });
  });

  it("maps a Clerk user with an internal membership to an actor", async () => {
    const resolved = await resolveOAuthActor({ DB: d1 }, { sub: SUPER_USER, client_id: "claude" });
    assert.equal(resolved.actor.role, "SUPER_ADMIN");
    assert.equal(resolved.token.kind, "OAUTH");
    assert.deepEqual(resolved.token.scopes, ["*"]);
  });

  it("rejects Clerk users without a SaveWatt internal membership", async () => {
    await assert.rejects(resolveOAuthActor({ DB: d1 }, { sub: "user_unknown_mcp_test" }), { code: "TOKEN_FORBIDDEN_ROLE" });
  });

  it("provisions a whitelisted Clerk user on first MCP sign-in", async () => {
    const userId = `user_mcpwl${Date.now()}`;
    const email = `wl-${Date.now()}@mcp.test`;
    d1.db
      .prepare(
        `INSERT INTO internal_user_whitelist (id, email, role, organization_id, status, created_by)
         VALUES (?, ?, 'OPERATOR_FINANCE', 'org_savewatt', 'ACTIVE', 'test')`,
      )
      .run(`wl-${userId}`, email);
    const clerkApi = async () =>
      Response.json({
        primary_email_address_id: "idn_1",
        email_addresses: [{ id: "idn_1", email_address: email, verification: { status: "verified" } }],
        first_name: "Test",
        last_name: "Finance",
      });
    const resolved = await resolveOAuthActor({ DB: d1, CLERK_SECRET_KEY: "sk_test_x" }, { sub: userId }, clerkApi);
    assert.equal(resolved.actor.role, "OPERATOR_FINANCE");
    assert.equal(resolved.actor.email, email);
  });
});

describe("OAuth discovery on the worker", () => {
  const env = { DB: d1 };

  it("advertises protected-resource metadata pointing at Clerk", async () => {
    const response = await worker.fetch(new Request("https://mcp.test/.well-known/oauth-protected-resource"), env);
    const body = await response.json();
    assert.deepEqual(body, protectedResourceMetadata("https://mcp.test", "https://clerk.savewatt.fr"));
    assert.equal(body.resource, "https://mcp.test/mcp");
  });

  it("returns WWW-Authenticate with resource metadata on 401", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.test/mcp", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }),
      env,
    );
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate"), /resource_metadata="https:\/\/mcp\.test\/\.well-known\/oauth-protected-resource"/);
  });
});
