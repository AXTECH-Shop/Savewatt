import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deliveryUpdateFromEmailEvent } from "./offer-delivery-events.ts";

describe("deliveryUpdateFromEmailEvent", () => {
  it("maps delivered events to DELIVERED without detail", () => {
    assert.deepEqual(
      deliveryUpdateFromEmailEvent({
        type: "cf.email.sending.message.delivered",
        payload: { messageId: "m1", delivery: { status: "delivered", smtpResponse: "250 OK" } },
      }),
      { messageId: "m1", state: "DELIVERED", detail: null },
    );
  });

  it("maps bounces, complaints, failures and rejections with a reason", () => {
    assert.deepEqual(
      deliveryUpdateFromEmailEvent({
        type: "cf.email.sending.message.bounced",
        payload: { messageId: "m2", bounce: { reason: "550 5.1.1 User unknown" } },
      }),
      { messageId: "m2", state: "BOUNCED", detail: "550 5.1.1 User unknown" },
    );
    assert.equal(
      deliveryUpdateFromEmailEvent({ type: "cf.email.sending.message.complained", payload: { messageId: "m3" } })?.state,
      "BOUNCED",
    );
    assert.deepEqual(
      deliveryUpdateFromEmailEvent({
        type: "cf.email.sending.message.rejected",
        payload: { messageId: "m4", rejection: { reason: "suppressed", detail: "Recipient is suppressed" } },
      }),
      { messageId: "m4", state: "FAILED", detail: "Recipient is suppressed" },
    );
  });

  it("ignores deferred, unknown, and message-less events", () => {
    assert.equal(
      deliveryUpdateFromEmailEvent({ type: "cf.email.sending.message.deferred", payload: { messageId: "m5" } }),
      null,
    );
    assert.equal(deliveryUpdateFromEmailEvent({ type: "something.else", payload: { messageId: "m6" } }), null);
    assert.equal(deliveryUpdateFromEmailEvent({ type: "cf.email.sending.message.delivered", payload: {} }), null);
  });
});
