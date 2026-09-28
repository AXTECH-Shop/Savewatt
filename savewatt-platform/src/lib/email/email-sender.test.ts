import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FROM, DEFAULT_REPLY_TO, sendEmail, type EmailBinding } from "./email-sender.ts";

const input = {
  to: ["client@example.test"],
  subject: "Votre offre Zack AI",
  html: "<p>Bonjour</p>",
};

describe("sendEmail", () => {
  it("skips gracefully when the EMAIL binding is absent", async () => {
    assert.deepEqual(await sendEmail(input, undefined), {
      kind: "skipped",
      reason: "EMAIL_BINDING_MISSING",
    });
  });

  it("returns the provider message id and sends attachments as attachments", async () => {
    let captured: Parameters<EmailBinding["send"]>[0] | null = null;
    const binding: EmailBinding = {
      async send(message) {
        captured = message;
        return { messageId: "msg-123" };
      },
    };
    const outcome = await sendEmail(
      { ...input, attachments: [{ filename: "offre.pdf", content: "JVBERi0=", type: "application/pdf" }] },
      binding,
    );
    assert.deepEqual(outcome, { kind: "sent", providerMessageId: "msg-123" });
    assert.deepEqual(captured!.from, DEFAULT_FROM);
    assert.equal(captured!.from.name, "Zack AI");
    assert.equal(captured!.replyTo, DEFAULT_REPLY_TO);
    assert.deepEqual(captured!.to, input.to);
    assert.equal(captured!.attachments?.[0].disposition, "attachment");
  });

  it("reports binding errors with their code without throwing", async () => {
    const binding: EmailBinding = {
      async send() {
        throw Object.assign(new Error("Sender domain not verified"), { code: "E_SENDER_NOT_VERIFIED" });
      },
    };
    assert.deepEqual(await sendEmail(input, binding), {
      kind: "failed",
      error: "E_SENDER_NOT_VERIFIED: Sender domain not verified",
    });
  });
});
