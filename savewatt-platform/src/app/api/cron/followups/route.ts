import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runFollowupSweep } from "@/lib/notifications/followup-sweep";

export const runtime = "nodejs";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function tokenMatches(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (receivedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(receivedBytes, expectedBytes);
}

/**
 * Trigger for the daily follow-up sweep. OpenNext for Cloudflare does not
 * expose a `scheduled` worker handler, so an external scheduler (a small
 * Cloudflare Cron Worker or any HTTPS cron) must POST here daily with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET missing — follow-up sweep endpoint disabled");
    return NextResponse.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  }

  const token = bearerToken(request);
  if (!token || !tokenMatches(token, secret)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const result = await runFollowupSweep(env);
  return NextResponse.json({ ok: true, result });
}
