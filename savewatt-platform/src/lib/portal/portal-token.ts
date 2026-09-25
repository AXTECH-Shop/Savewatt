import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed tokens for the public customer offer portal
 * (/portal/offer/[token]). The token is the authorization: it carries the
 * offer version id and recipient e-mail, HMAC-SHA256 signed with the
 * PORTAL_TOKEN_SECRET environment variable (worker secret, min 16 chars).
 * No database table is involved; expiry is embedded in the payload.
 *
 * Format: `<base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>`
 * where the signature is computed over the encoded payload string.
 *
 * Pure module — no I/O beyond reading the secret — so it stays unit-testable
 * with bare `node --test`. When imported from tested code, keep runtime
 * imports relative with explicit .ts extensions.
 */

export const PORTAL_TOKEN_SECRET_ENV = "PORTAL_TOKEN_SECRET";

/** Default link validity: 7 days, matching the commercial validity window. */
export const DEFAULT_PORTAL_TOKEN_TTL_SECONDS = 7 * 24 * 3600;

const MIN_SECRET_LENGTH = 16;

export interface PortalTokenPayload {
  offerVersionId: string;
  recipientEmail: string;
  /** Expiry, unix seconds. */
  exp: number;
}

/** Thrown when PORTAL_TOKEN_SECRET is unset or too weak — a server error. */
export class PortalTokenError extends Error {
  readonly code = "PORTAL_TOKEN_SECRET_MISSING";

  constructor() {
    super("PORTAL_TOKEN_SECRET_MISSING");
    this.name = "PortalTokenError";
  }
}

export interface PortalTokenOptions {
  /** Override the env secret (tests only). */
  secret?: string;
  /** Override the current time, unix seconds (tests only). */
  nowSeconds?: number;
}

export interface IssuePortalTokenOptions extends PortalTokenOptions {
  ttlSeconds?: number;
}

export type PortalTokenInspection =
  | { status: "valid"; payload: PortalTokenPayload }
  | { status: "expired" }
  | { status: "invalid" };

function resolveSecret(secret?: string): string {
  const value = secret ?? process.env[PORTAL_TOKEN_SECRET_ENV];
  if (typeof value !== "string" || value.length < MIN_SECRET_LENGTH) {
    throw new PortalTokenError();
  }
  return value;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest("base64url");
}

function safeEqual(received: string, expected: string): boolean {
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function isPayload(value: unknown): value is PortalTokenPayload & { v: 1 } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.offerVersionId === "string" &&
    candidate.offerVersionId.length > 0 &&
    typeof candidate.recipientEmail === "string" &&
    candidate.recipientEmail.length > 0 &&
    typeof candidate.exp === "number" &&
    Number.isFinite(candidate.exp)
  );
}

/**
 * Issue a signed portal token for an offer version. Throws PortalTokenError
 * when PORTAL_TOKEN_SECRET is missing — unsigned tokens are never issued.
 */
export function issuePortalToken(
  input: { offerVersionId: string; recipientEmail: string },
  options: IssuePortalTokenOptions = {},
): string {
  const secret = resolveSecret(options.secret);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds ?? DEFAULT_PORTAL_TOKEN_TTL_SECONDS;
  const payload = {
    v: 1,
    offerVersionId: input.offerVersionId,
    recipientEmail: input.recipientEmail.trim().toLowerCase(),
    exp: now + ttl,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/**
 * Full inspection: distinguishes an expired token (friendly "lien expiré"
 * page) from a tampered/malformed one (generic error, no information leak).
 */
export function inspectPortalToken(
  token: string,
  options: PortalTokenOptions = {},
): PortalTokenInspection {
  const secret = resolveSecret(options.secret);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (typeof token !== "string") return { status: "invalid" };
  const separator = token.lastIndexOf(".");
  if (separator < 1 || separator === token.length - 1) return { status: "invalid" };
  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!BASE64URL_PATTERN.test(body) || !BASE64URL_PATTERN.test(signature)) {
    return { status: "invalid" };
  }
  if (!safeEqual(signature, sign(body, secret))) return { status: "invalid" };

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { status: "invalid" };
  }
  if (!isPayload(decoded)) return { status: "invalid" };
  if (decoded.exp <= now) return { status: "expired" };

  return {
    status: "valid",
    payload: {
      offerVersionId: decoded.offerVersionId,
      recipientEmail: decoded.recipientEmail,
      exp: decoded.exp,
    },
  };
}

/** Verify a portal token. Returns the payload, or null when expired/invalid. */
export function verifyPortalToken(
  token: string,
  options: PortalTokenOptions = {},
): PortalTokenPayload | null {
  const result = inspectPortalToken(token, options);
  return result.status === "valid" ? result.payload : null;
}
