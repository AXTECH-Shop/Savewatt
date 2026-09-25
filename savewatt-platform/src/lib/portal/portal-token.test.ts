import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PORTAL_TOKEN_TTL_SECONDS,
  PortalTokenError,
  inspectPortalToken,
  issuePortalToken,
  verifyPortalToken,
} from "./portal-token.ts";

const SECRET = "test-portal-secret-0123456789abcdef";
const NOW = 1_800_000_000; // fixed unix seconds for determinism

const INPUT = {
  offerVersionId: "ov_123",
  recipientEmail: "Marie.Dupont@Example.fr",
};

describe("portal token issuing", () => {
  it("issues a base64url payload + signature pair", () => {
    const token = issuePortalToken(INPUT, { secret: SECRET, nowSeconds: NOW });
    const [body, signature] = token.split(".");
    assert.ok(body.match(/^[A-Za-z0-9_-]+$/));
    assert.ok(signature.match(/^[A-Za-z0-9_-]+$/));
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    assert.equal(payload.offerVersionId, "ov_123");
    assert.equal(payload.recipientEmail, "marie.dupont@example.fr"); // normalized
    assert.equal(payload.exp, NOW + DEFAULT_PORTAL_TOKEN_TTL_SECONDS);
  });

  it("round-trips issue → verify", () => {
    const token = issuePortalToken(INPUT, { secret: SECRET, nowSeconds: NOW });
    const payload = verifyPortalToken(token, { secret: SECRET, nowSeconds: NOW + 60 });
    assert.deepEqual(payload, {
      offerVersionId: "ov_123",
      recipientEmail: "marie.dupont@example.fr",
      exp: NOW + DEFAULT_PORTAL_TOKEN_TTL_SECONDS,
    });
  });

  it("honours a custom TTL", () => {
    const token = issuePortalToken(INPUT, {
      secret: SECRET,
      nowSeconds: NOW,
      ttlSeconds: 3600,
    });
    assert.equal(verifyPortalToken(token, { secret: SECRET, nowSeconds: NOW + 3599 })?.exp, NOW + 3600);
    assert.equal(verifyPortalToken(token, { secret: SECRET, nowSeconds: NOW + 3600 }), null);
  });
});

describe("portal token verification", () => {
  it("rejects a tampered payload", () => {
    const token = issuePortalToken(INPUT, { secret: SECRET, nowSeconds: NOW });
    const [body, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ v: 1, offerVersionId: "ov_other", recipientEmail: "a@b.fr", exp: NOW + 1e6 }),
      "utf8",
    ).toString("base64url");
    assert.equal(verifyPortalToken(`${forged}.${signature}`, { secret: SECRET, nowSeconds: NOW }), null);
    assert.equal(verifyPortalToken(`${body}.${signature.slice(0, -2)}aa`, { secret: SECRET, nowSeconds: NOW }), null);
    assert.equal(inspectPortalToken(`${forged}.${signature}`, { secret: SECRET, nowSeconds: NOW }).status, "invalid");
  });

  it("rejects a token signed with another secret", () => {
    const token = issuePortalToken(INPUT, { secret: SECRET, nowSeconds: NOW });
    assert.equal(
      verifyPortalToken(token, { secret: "other-portal-secret-0123456789", nowSeconds: NOW }),
      null,
    );
  });

  it("rejects malformed tokens", () => {
    for (const token of ["", "abc", "abc.", ".abc", "a+b/c.d", "abc.def.ghi"]) {
      assert.equal(verifyPortalToken(token, { secret: SECRET, nowSeconds: NOW }), null, token);
    }
  });

  it("distinguishes expired from invalid", () => {
    const token = issuePortalToken(INPUT, { secret: SECRET, nowSeconds: NOW, ttlSeconds: 60 });
    const atExpiry = { secret: SECRET, nowSeconds: NOW + 60 };
    assert.equal(verifyPortalToken(token, atExpiry), null);
    assert.deepEqual(inspectPortalToken(token, atExpiry), { status: "expired" });
    assert.equal(inspectPortalToken("garbage", atExpiry).status, "invalid");
  });
});

describe("portal token secret handling", () => {
  it("throws a server error instead of issuing an unsigned token", () => {
    const previous = process.env.PORTAL_TOKEN_SECRET;
    delete process.env.PORTAL_TOKEN_SECRET;
    try {
      assert.throws(() => issuePortalToken(INPUT, { nowSeconds: NOW }), PortalTokenError);
      assert.throws(() => verifyPortalToken("a.b", { nowSeconds: NOW }), PortalTokenError);
    } finally {
      if (previous === undefined) delete process.env.PORTAL_TOKEN_SECRET;
      else process.env.PORTAL_TOKEN_SECRET = previous;
    }
  });

  it("rejects a weak secret", () => {
    assert.throws(() => issuePortalToken(INPUT, { secret: "short" }), PortalTokenError);
  });

  it("uses PORTAL_TOKEN_SECRET from the environment by default", () => {
    const previous = process.env.PORTAL_TOKEN_SECRET;
    process.env.PORTAL_TOKEN_SECRET = SECRET;
    try {
      const token = issuePortalToken(INPUT, { nowSeconds: NOW });
      assert.ok(verifyPortalToken(token, { nowSeconds: NOW }));
    } finally {
      if (previous === undefined) delete process.env.PORTAL_TOKEN_SECRET;
      else process.env.PORTAL_TOKEN_SECRET = previous;
    }
  });
});
