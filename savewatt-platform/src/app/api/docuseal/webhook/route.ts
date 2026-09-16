import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ProviderEventRepository } from "@/lib/integrations/provider-event-repository";
import { WebhookSignatureVerifier } from "@/lib/integrations/webhook-signature";
import { DocuSealSubmissionRepository } from "@/lib/signing/docuseal-submission-repository";

export const runtime = "nodejs";

interface DocuSealWebhook {
  event_type?: string;
  timestamp?: string;
  data?: {
    id?: number | string;
    external_id?: string;
    submission?: { id?: number | string };
  };
}

export async function POST(request: Request) {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  const signature = request.headers.get("x-docuseal-signature") ?? "";
  if (!secret) {
    return NextResponse.json({ error: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }

  const rawPayload = await request.text();
  if (rawPayload.length > 1_000_000) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  if (!WebhookSignatureVerifier.verifyDocuSeal(rawPayload, signature, secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: DocuSealWebhook;
  try {
    payload = JSON.parse(rawPayload) as DocuSealWebhook;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const eventType = payload.event_type;
  const submitterId = payload.data?.id;
  const submissionId = payload.data?.submission?.id;
  const dossierId = payload.data?.external_id;
  if (!eventType || !payload.data) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }

  const payloadHash = createHash("sha256").update(rawPayload).digest("hex");
  const providerEventKey = `${eventType}:${payload.timestamp ?? "unknown"}:${submitterId ?? payloadHash}`;
  const events = new ProviderEventRepository();
  await events.record({
    provider: "DOCUSEAL",
    providerEventKey,
    eventType,
    rawPayload,
  });

  if (eventType !== "form.completed" && eventType !== "form.declined") {
    await events.markProcessed("DOCUSEAL", providerEventKey);
    return new NextResponse(null, { status: 204 });
  }

  if (!dossierId || submitterId == null || submissionId == null) {
    await events.markFailed("DOCUSEAL", providerEventKey, "MISSING_DOSSIER_OR_PROVIDER_ID");
    return NextResponse.json({ error: "INVALID_SIGNING_EVENT" }, { status: 400 });
  }

  try {
    const signatures = new DocuSealSubmissionRepository();
    if (eventType === "form.completed") {
      const updated = await signatures.markCompleted(
        dossierId,
        String(submissionId),
        String(submitterId),
      );
      if (!updated) throw new Error("SIGNATURE_SUBMISSION_NOT_FOUND");
    } else {
      const updated = await signatures.markDeclined(
        dossierId,
        String(submissionId),
        String(submitterId),
      );
      if (!updated) throw new Error("SIGNATURE_SUBMISSION_NOT_FOUND");
    }
    await events.markProcessed("DOCUSEAL", providerEventKey);
    return NextResponse.json({ accepted: true, dossierId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DOCUSEAL_PERSISTENCE_FAILED";
    await events.markFailed("DOCUSEAL", providerEventKey, message);
    return NextResponse.json({ error: message, retryable: true }, { status: 503 });
  }
}
