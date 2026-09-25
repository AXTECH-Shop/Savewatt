import { createHash } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { CrmError } from "@/lib/crm/crm-errors";
import { IntakeManager, WEB_INTAKE_ACTOR } from "@/lib/intake/intake-manager";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 11 * 1024 * 1024;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

function text(form: FormData, key: string, max: number): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function turnstileOk(token: string | null, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return result?.success === true;
}

/** Public ad landing: bill upload → lead → offer by email (or adviser follow-up). */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }
  // Honeypot: bots fill every field; answer as if accepted.
  if (text(form, "website", 200)) return NextResponse.json({ status: "NEEDS_REVIEW" }, { status: 202 });

  const email = text(form, "email", 254)?.toLowerCase() ?? null;
  if (!email || !EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (form.get("consent") !== "on") return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip");
  if (!(await turnstileOk(text(form, "cf-turnstile-response", 2048), ip))) {
    return NextResponse.json({ error: "CHALLENGE_FAILED" }, { status: 403 });
  }
  const ipHash = ip
    ? createHash("sha256").update(`${process.env.PORTAL_TOKEN_SECRET ?? ""}:${ip}`).digest("hex")
    : null;

  const manager = new IntakeManager();
  const [byIp, byEmail] = await Promise.all([
    manager.recentCount({ ipHash }, 3600),
    manager.recentCount({ email }, 86_400),
  ]);
  if (byIp >= 5 || byEmail >= 3) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const attribution: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = text(form, key, 200);
    if (value) attribution[key] = value;
  }

  let submissionId: string;
  try {
    submissionId = await manager.receive(WEB_INTAKE_ACTOR, file, {
      channel: "PUBLIC_WEB",
      contact: {
        name: text(form, "name", 180),
        email,
        phone: text(form, "phone", 40),
        company: text(form, "company", 180),
      },
      ipHash,
      attribution,
    });
  } catch (error) {
    if (error instanceof CrmError && error.status === 415) {
      return NextResponse.json({ error: "UNSUPPORTED_FILE" }, { status: 415 });
    }
    if (error instanceof CrmError && error.field === "fileSize") {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
    }
    console.error("PUBLIC_INTAKE_RECEIVE_FAILED", error);
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  }

  // Keep processing alive if the visitor closes the tab mid-analysis.
  const processing = manager.autoProcess(WEB_INTAKE_ACTOR, submissionId);
  getCloudflareContext().ctx.waitUntil(processing);
  const outcome = await processing;
  return NextResponse.json({ status: outcome.status, email }, { status: 202 });
}
