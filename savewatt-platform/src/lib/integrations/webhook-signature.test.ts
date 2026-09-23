import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WebhookSignatureVerifier } from "./webhook-signature.ts";

describe("WebhookSignatureVerifier", () => {
  it("validates Tremendous HMAC signatures over the raw payload", () => {
    const payload = '{"event":"ORDERS.CREATED","uuid":"event-1"}';
    const secret = "tremendous-test-secret";
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    const header = `sha256=${signature}`;

    assert.equal(WebhookSignatureVerifier.verifyTremendous(payload, header, secret), true);
    assert.equal(WebhookSignatureVerifier.verifyTremendous(`${payload} `, header, secret), false);
    assert.equal(WebhookSignatureVerifier.verifyTremendous(payload, signature, secret), false);
  });

  it("validates fresh DocuSeal timestamped signatures and rejects stale ones", () => {
    const now = 1_800_000_000;
    const payload = '{"event_type":"form.completed"}';
    const secret = "whsec_test";
    const signature = createHmac("sha256", secret)
      .update(`${now}.${payload}`)
      .digest("hex");
    const header = `${now}.${signature}`;

    assert.equal(WebhookSignatureVerifier.verifyDocuSeal(payload, header, secret, now), true);
    assert.equal(WebhookSignatureVerifier.verifyDocuSeal(payload, header, secret, now + 301), false);
  });
});
