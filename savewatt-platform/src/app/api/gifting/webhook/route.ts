import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ProviderEventRepository } from "@/lib/integrations/provider-event-repository";
import { WebhookSignatureVerifier } from "@/lib/integrations/webhook-signature";

export const runtime = "nodejs";

interface GiftogramWebhook {
  event_type?: string;
  event?: string;
  id?: string;
  data?: { id?: string };
}

export async function POST(request: Request) {
  const secret = process.env.GIFTOGRAM_WEBHOOK_SECRET;
  const signature = request.headers.get("x-giftogram-signature") ?? "";
  if (!secret) {
    return NextResponse.json({ error: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }

  const rawPayload = await request.text();
  if (rawPayload.length > 1_000_000) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  if (!WebhookSignatureVerifier.verifyGiftogram(rawPayload, signature, secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: GiftogramWebhook;
  try {
    payload = JSON.parse(rawPayload) as GiftogramWebhook;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const eventType = payload.event_type ?? payload.event;
  if (!eventType) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }

  const payloadHash = createHash("sha256").update(rawPayload).digest("hex");
  const providerEventKey = `${eventType}:${payload.id ?? payload.data?.id ?? payloadHash}`;
  const repository = new ProviderEventRepository();
  const inserted = await repository.record({
    provider: "GIFTOGRAM",
    providerEventKey,
    eventType,
    rawPayload,
  });
  if (!inserted) return NextResponse.json({ accepted: true, duplicate: true });

  await repository.markProcessed("GIFTOGRAM", providerEventKey);
  return NextResponse.json({ accepted: true });
}
