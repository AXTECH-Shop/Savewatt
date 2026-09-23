import { createHmac, timingSafeEqual } from "node:crypto";

function safeHexMatch(received: string, expected: string): boolean {
  if (!/^[a-f0-9]+$/i.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

export class WebhookSignatureVerifier {
  static verifyTremendous(rawPayload: string, signatureHeader: string, secret: string): boolean {
    if (!signatureHeader.startsWith("sha256=")) return false;
    const signature = signatureHeader.slice("sha256=".length);
    const expected = createHmac("sha256", secret).update(rawPayload).digest("hex");
    return safeHexMatch(signature, expected);
  }

  static verifyDocuSeal(
    rawPayload: string,
    signatureHeader: string,
    secret: string,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): boolean {
    const separator = signatureHeader.indexOf(".");
    if (separator < 1) return false;

    const timestamp = signatureHeader.slice(0, separator);
    const received = signatureHeader.slice(separator + 1);
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber) || Math.abs(nowSeconds - timestampNumber) > 300) {
      return false;
    }

    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${rawPayload}`)
      .digest("hex");
    return safeHexMatch(received, expected);
  }
}
