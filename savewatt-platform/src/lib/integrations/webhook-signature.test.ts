import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WebhookSignatureVerifier } from "./webhook-signature.ts";

describe("WebhookSignatureVerifier", () => {
  it("validates Giftogram HMAC signatures over the raw payload", () => {
    const payload = '{"event_type":"order.created","data":{"id":"order-1"}}';
    const secret = "giftogram-test-secret";
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    assert.equal(WebhookSignatureVerifier.verifyGiftogram(payload, signature, secret), true);
    assert.equal(WebhookSignatureVerifier.verifyGiftogram(`${payload} `, signature, secret), false);
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
