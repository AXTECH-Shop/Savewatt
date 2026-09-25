import { normalizeRole, scopeForRole, type WorkspaceActor } from "@/lib/access-control";
import { AccountAccessRepository } from "@/lib/access/account-access-repository";
import { McpAuthError, MCP_V1_TOKEN_ROLES, type ResolvedToken } from "./auth.ts";

/**
 * OAuth for remote MCP clients (claude.ai custom connectors, Claude Desktop):
 * Clerk (clerk.savewatt.fr) is the authorization server — dynamic client
 * registration + PKCE — and this worker is the protected resource. Access
 * tokens are Clerk-signed JWTs verified offline against the instance JWKS.
 */

export const DEFAULT_CLERK_ISSUER = "https://clerk.savewatt.fr";
const CLOCK_SKEW_SECONDS = 30;
const JWKS_TTL_MS = 60 * 60 * 1000;

interface JwtHeader {
  alg?: string;
  kid?: string;
}

export interface ClerkJwtClaims {
  iss?: string;
  sub?: string;
  exp?: number;
  nbf?: number;
  client_id?: string;
  azp?: string;
}

export interface OAuthEnv {
  DB: D1Database;
  CLERK_ISSUER?: string;
  CLERK_SECRET_KEY?: string;
}

let jwksCache: { issuer: string; fetchedAt: number; keys: Map<string, CryptoKey> } | null = null;

export function looksLikeJwt(token: string): boolean {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(token);
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment))) as T;
}

async function signingKey(issuer: string, kid: string, fetcher: typeof fetch): Promise<CryptoKey | null> {
  const fresh = jwksCache && jwksCache.issuer === issuer && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh && jwksCache!.keys.has(kid)) return jwksCache!.keys.get(kid)!;

  const response = await fetcher(`${issuer}/.well-known/jwks.json`);
  if (!response.ok) return null;
  const body = (await response.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
  const keys = new Map<string, CryptoKey>();
  for (const jwk of body.keys ?? []) {
    if (!jwk.kid || jwk.kty !== "RSA") continue;
    keys.set(
      jwk.kid,
      await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]),
    );
  }
  jwksCache = { issuer, fetchedAt: Date.now(), keys };
  return keys.get(kid) ?? null;
}

/** Verify signature (RS256, issuer JWKS), issuer and time claims. Throws McpAuthError. */
export async function verifyClerkJwt(
  token: string,
  issuer: string,
  fetcher: typeof fetch = fetch,
  now: number = Math.floor(Date.now() / 1000),
): Promise<ClerkJwtClaims & { sub: string }> {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  let header: JwtHeader;
  let claims: ClerkJwtClaims;
  try {
    header = decodeJson<JwtHeader>(headerPart);
    claims = decodeJson<ClerkJwtClaims>(payloadPart);
  } catch {
    throw new McpAuthError("TOKEN_INVALID", 401);
  }
  if (header.alg !== "RS256" || !header.kid) throw new McpAuthError("TOKEN_INVALID", 401);

  const key = await signingKey(issuer, header.kid, fetcher);
  if (!key) throw new McpAuthError("TOKEN_INVALID", 401);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlDecode(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!valid) throw new McpAuthError("TOKEN_INVALID", 401);

  if (claims.iss !== issuer) throw new McpAuthError("TOKEN_INVALID", 401);
  if (typeof claims.exp !== "number" || claims.exp < now - CLOCK_SKEW_SECONDS) {
    throw new McpAuthError("TOKEN_INVALID", 401);
  }
  if (typeof claims.nbf === "number" && claims.nbf > now + CLOCK_SKEW_SECONDS) {
    throw new McpAuthError("TOKEN_INVALID", 401);
  }
  if (typeof claims.sub !== "string" || !claims.sub.startsWith("user_")) {
    throw new McpAuthError("TOKEN_INVALID", 401);
  }
  return claims as ClerkJwtClaims & { sub: string };
}

interface ClerkUser {
  primary_email_address_id: string | null;
  email_addresses: { id: string; email_address: string; verification?: { status?: string } | null }[];
  first_name: string | null;
  last_name: string | null;
}

/** Verified primary email + display name from the Clerk Backend API (first MCP sign-in only). */
async function clerkIdentity(
  userId: string,
  secretKey: string,
  fetcher: typeof fetch,
): Promise<{ email: string; displayName: string } | null> {
  const response = await fetcher(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as ClerkUser;
  const primary = user.email_addresses.find((address) => address.id === user.primary_email_address_id);
  if (!primary || primary.verification?.status !== "verified") return null;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || primary.email_address;
  return { email: primary.email_address, displayName };
}

/**
 * Clerk user → SaveWatt actor. Same rule as the web app: an existing ACTIVE
 * membership, else the internal whitelist (provisioned on first sign-in).
 * Only internal roles (admin-first v1) may use the MCP.
 */
export async function resolveOAuthActor(
  env: OAuthEnv,
  claims: ClerkJwtClaims & { sub: string },
  fetcher: typeof fetch = fetch,
): Promise<ResolvedToken> {
  const access = new AccountAccessRepository(env.DB);
  let membership = await access.findActiveMembership(claims.sub);
  if (!membership && env.CLERK_SECRET_KEY) {
    const identity = await clerkIdentity(claims.sub, env.CLERK_SECRET_KEY, fetcher);
    if (identity) {
      membership = await access.findOrProvisionWhitelistedMembership({ clerkUserId: claims.sub, ...identity });
    }
  }
  if (!membership) throw new McpAuthError("TOKEN_FORBIDDEN_ROLE", 403);
  if (!MCP_V1_TOKEN_ROLES.includes(membership.role)) throw new McpAuthError("TOKEN_FORBIDDEN_ROLE", 403);

  const actor = await loadActor(env.DB, claims.sub);
  if (!actor) throw new McpAuthError("TOKEN_FORBIDDEN_ROLE", 403);
  return {
    actor,
    token: { id: `oauth:${claims.client_id ?? claims.azp ?? "clerk"}`, kind: "OAUTH", scopes: ["*"] },
  };
}

/** Active SaveWatt actor for a user id (null when the membership is gone or suspended). */
export async function loadActor(database: D1Database, userId: string): Promise<WorkspaceActor | null> {
  const membership = await new AccountAccessRepository(database).findActiveMembership(userId);
  if (!membership) return null;
  const role = normalizeRole(membership.role);
  const user = await database
    .prepare(`SELECT email, display_name FROM users WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<{ email: string; display_name: string }>();
  return {
    userId,
    displayName: user?.display_name ?? user?.email ?? "SaveWatt",
    email: user?.email ?? "",
    role,
    orgId: membership.organizationId,
    orgName: membership.organizationName,
    orgPath: membership.organizationPath,
    scope: scopeForRole(role),
    isPreview: false,
  };
}

/** RFC 9728 protected-resource metadata advertised to MCP clients. */
export function protectedResourceMetadata(origin: string, issuer: string) {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email", "profile"],
    resource_name: "SaveWatt",
    resource_documentation: "https://savewatt.fr",
  };
}

export function wwwAuthenticate(origin: string): string {
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`;
}
