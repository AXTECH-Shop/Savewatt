import { NextResponse } from "next/server";
import { ProviderEventRepository } from "@/lib/integrations/provider-event-repository";
import { WebhookSignatureVerifier } from "@/lib/integrations/webhook-signature";

export const runtime = "nodejs";

interface TremendousWebhook {
  event?: string;
  uuid?: string;
  payload?: { resource?: { id?: string; type?: string } };
}

export async function POST(request: Request) {
  const secret = process.env.TREMENDOUS_WEBHOOK_SECRET;
  const signature = request.headers.get("Tremendous-Webhook-Signature") ?? "";
  if (!secret) {
    return NextResponse.json({ error: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }

  const rawPayload = await request.text();
  if (rawPayload.length > 1_000_000) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  if (!WebhookSignatureVerifier.verifyTremendous(rawPayload, signature, secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: TremendousWebhook;
  try {
    payload = JSON.parse(rawPayload) as TremendousWebhook;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const eventType = payload.event;
  if (!eventType || !payload.uuid) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }

  const providerEventKey = payload.uuid;
  const repository = new ProviderEventRepository();
  const inserted = await repository.record({
    provider: "TREMENDOUS",
    providerEventKey,
    eventType,
    rawPayload,
  });
  if (!inserted) return NextResponse.json({ accepted: true, duplicate: true });

  await repository.markProcessed("TREMENDOUS", providerEventKey);
  return NextResponse.json({ accepted: true });
}
