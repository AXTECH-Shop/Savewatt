import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { TremendousClient } from "./tremendous-client.ts";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  apiKey: process.env.TREMENDOUS_API_KEY,
  baseUrl: process.env.TREMENDOUS_BASE_URL,
  campaignId: process.env.TREMENDOUS_CAMPAIGN_ID,
  fundingSourceId: process.env.TREMENDOUS_FUNDING_SOURCE_ID,
};

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment("TREMENDOUS_API_KEY", originalEnvironment.apiKey);
  restoreEnvironment("TREMENDOUS_BASE_URL", originalEnvironment.baseUrl);
  restoreEnvironment("TREMENDOUS_CAMPAIGN_ID", originalEnvironment.campaignId);
  restoreEnvironment("TREMENDOUS_FUNDING_SOURCE_ID", originalEnvironment.fundingSourceId);
});

describe("TremendousClient", () => {
  it("creates an idempotent EUR email reward through the sandbox API", async () => {
    process.env.TREMENDOUS_API_KEY = "TEST_real_sandbox_key";
    // cloudflare-env.d.ts pins TREMENDOUS_BASE_URL to the wrangler var literal;
    // override via a plain record for the sandbox test.
    (process.env as Record<string, string | undefined>).TREMENDOUS_BASE_URL =
      "https://testflight.tremendous.com/api/v2/";
    process.env.TREMENDOUS_CAMPAIGN_ID = "CAMPAIGN123";
    process.env.TREMENDOUS_FUNDING_SOURCE_ID = "BALANCE";

    globalThis.fetch = async (input, init) => {
      assert.equal(input, "https://testflight.tremendous.com/api/v2/orders");
      assert.equal(init?.method, "POST");
      assert.deepEqual(init?.headers, {
        Authorization: "Bearer TEST_real_sandbox_key",
        "Content-Type": "application/json",
      });
      assert.deepEqual(JSON.parse(String(init?.body)), {
        external_id: "savewatt-order-1",
        payment: { funding_source_id: "BALANCE" },
        reward: {
          campaign_id: "CAMPAIGN123",
          value: { denomination: 25, currency_code: "EUR" },
          recipient: { name: "Camille Martin", email: "camille@example.fr" },
          language: "fr",
          delivery: {
            method: "EMAIL",
            meta: {
              sender_name: "SaveWatt",
              subject_line: "Votre avantage SaveWatt",
              message: "Votre avantage est disponible.",
            },
          },
        },
      });

      return Response.json({
        order: {
          id: "ORDER123",
          external_id: "savewatt-order-1",
          status: "EXECUTED",
        },
      });
    };

    const order = await new TremendousClient().createOrder({
      externalId: "savewatt-order-1",
      recipientEmail: "camille@example.fr",
      recipientName: "Camille Martin",
      denomination: 25,
      subject: "Votre avantage SaveWatt",
      message: "Votre avantage est disponible.",
    });

    assert.equal(order.id, "ORDER123");
    assert.equal(order.status, "EXECUTED");
  });
});