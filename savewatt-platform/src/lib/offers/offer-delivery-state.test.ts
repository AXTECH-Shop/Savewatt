import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTerminalDeliveryState,
  shouldApplyDeliveryUpdate,
} from "./offer-delivery-state.ts";

describe("shouldApplyDeliveryUpdate", () => {
  it("advances SENT to DELIVERED", () => {
    assert.equal(shouldApplyDeliveryUpdate("SENT", "DELIVERED"), true);
    assert.equal(shouldApplyDeliveryUpdate("QUEUED", "DELIVERED"), true);
  });

  it("lets a negative terminal override SENT or DELIVERED (late bounce)", () => {
    assert.equal(shouldApplyDeliveryUpdate("SENT", "BOUNCED"), true);
    assert.equal(shouldApplyDeliveryUpdate("DELIVERED", "BOUNCED"), true);
    assert.equal(shouldApplyDeliveryUpdate("SENT", "FAILED"), true);
  });

  it("keeps the first negative terminal (duplicates and races do not corrupt state)", () => {
    assert.equal(shouldApplyDeliveryUpdate("BOUNCED", "FAILED"), false);
    assert.equal(shouldApplyDeliveryUpdate("FAILED", "BOUNCED"), false);
    assert.equal(shouldApplyDeliveryUpdate("BOUNCED", "DELIVERED"), false);
  });

  it("rejects duplicate and regressive updates", () => {
    assert.equal(shouldApplyDeliveryUpdate("DELIVERED", "DELIVERED"), false);
    assert.equal(shouldApplyDeliveryUpdate("DELIVERED", "SENT"), false);
    assert.equal(shouldApplyDeliveryUpdate("SENT", "QUEUED"), false);
    assert.equal(shouldApplyDeliveryUpdate("BOUNCED", "SENT"), false);
  });
});

describe("isTerminalDeliveryState", () => {
  it("treats DELIVERED, BOUNCED and FAILED as terminal", () => {
    assert.equal(isTerminalDeliveryState("DELIVERED"), true);
    assert.equal(isTerminalDeliveryState("BOUNCED"), true);
    assert.equal(isTerminalDeliveryState("FAILED"), true);
    assert.equal(isTerminalDeliveryState("SENT"), false);
    assert.equal(isTerminalDeliveryState("QUEUED"), false);
  });
});
