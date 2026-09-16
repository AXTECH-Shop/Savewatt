import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function safeTokenMatch(received: string, expected: string): boolean {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const expectedToken = process.env.DOCUSEAL_WEBHOOK_TOKEN;
  const receivedToken = new URL(request.url).searchParams.get("token") ?? "";
  if (!expectedToken || !safeTokenMatch(receivedToken, expectedToken)) {
    return NextResponse.json({ error: "UNAUTHORIZED_WEBHOOK" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 1_000_000) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const event = payload as { event_type?: string; data?: { external_id?: string } };
  if (!event.event_type || !event.data) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }

  if (event.event_type !== "form.completed" && event.event_type !== "form.declined") {
    return new NextResponse(null, { status: 204 });
  }

  const completionUrl = process.env.DOCUSEAL_COMPLETION_URL;
  const completionToken = process.env.DOCUSEAL_COMPLETION_TOKEN;
  if (!completionUrl || !completionToken) {
    return NextResponse.json(
      { error: "PERSISTENCE_NOT_CONFIGURED", retryable: true },
      { status: 503 },
    );
  }

  const response = await fetch(completionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${completionToken}`,
    },
    body: raw,
  });

  if (!response.ok) {
    return NextResponse.json({ error: "PERSISTENCE_FAILED", retryable: true }, { status: 502 });
  }

  return NextResponse.json({ accepted: true, dossierId: event.data.external_id ?? null });
}
