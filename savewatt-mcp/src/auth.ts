import { createHash } from "node:crypto";
import { scopeForRole, type AppRole, type WorkspaceActor } from "@/lib/access-control";

export interface ApiTokenRow {
  id: string;
  kind: "PAT" | "SERVICE" | "OAUTH";
  scopes: string[];
}

export interface ResolvedToken {
  token: ApiTokenRow;
  actor: WorkspaceActor;
}

/** Roles allowed to hold MCP tokens in v1 (spec §13.1 — admin-first). */
export const MCP_V1_TOKEN_ROLES: AppRole[] = ["SUPER_ADMIN", "OPERATOR_FINANCE"];

export class McpAuthError extends Error {
  constructor(
    readonly code: "UNAUTHENTICATED" | "TOKEN_INVALID" | "TOKEN_FORBIDDEN_ROLE" | "SCOPE_MISSING",
    readonly status: number,
  ) {
    super(code);
    this.name = "McpAuthError";
  }
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

interface TokenJoinRow {
  id: string;
  kind: "PAT" | "SERVICE";
  scopes_json: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: AppRole;
  org_id: string;
  org_name: string;
  org_path: string;
}

/** Bearer token → sha256 → api_tokens (ACTIVE, unexpired) → actor via memberships. */
export async function resolveBearerToken(
  database: D1Database,
  authorization: string | null,
): Promise<ResolvedToken> {
  const plaintext = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!plaintext) throw new McpAuthError("UNAUTHENTICATED", 401);

  const row = await database
    .prepare(
      `SELECT token.id, token.kind, token.scopes_json,
              owner.id AS user_id, owner.display_name, owner.email,
              membership.role,
              org.id AS org_id, org.name AS org_name, org.path AS org_path
       FROM api_tokens token
       JOIN users owner ON owner.id = token.owner_user_id
       JOIN organizations org ON org.id = token.organization_id
       JOIN memberships membership
         ON membership.organization_id = token.organization_id
        AND membership.user_id = token.owner_user_id
        AND membership.status = 'ACTIVE'
       WHERE token.token_hash = ?
         AND token.status = 'ACTIVE'
         AND (token.expires_at IS NULL OR token.expires_at > unixepoch())
       LIMIT 1`,
    )
    .bind(hashToken(plaintext))
    .first<TokenJoinRow>();

  if (!row) throw new McpAuthError("TOKEN_INVALID", 401);
  if (!MCP_V1_TOKEN_ROLES.includes(row.role)) {
    throw new McpAuthError("TOKEN_FORBIDDEN_ROLE", 403);
  }

  let scopes: string[] = [];
  try {
    const parsed = JSON.parse(row.scopes_json) as unknown;
    if (Array.isArray(parsed)) scopes = parsed.filter((s): s is string => typeof s === "string");
  } catch {
    scopes = [];
  }

  return {
    token: { id: row.id, kind: row.kind, scopes },
    actor: {
      userId: row.user_id,
      displayName: row.display_name ?? row.email ?? "MCP token",
      email: row.email ?? "",
      role: row.role,
      orgId: row.org_id,
      orgName: row.org_name,
      orgPath: row.org_path,
      scope: scopeForRole(row.role),
      isPreview: false,
    },
  };
}

export function assertScopes(token: ApiTokenRow, required: string[]): void {
  if (token.scopes.includes("*")) return;
  const missing = required.filter((scope) => !token.scopes.includes(scope));
  if (missing.length > 0) throw new McpAuthError("SCOPE_MISSING", 403);
}

/** Throttled-ish last_used_at update (fire-and-forget semantics handled by caller). */
export async function touchToken(database: D1Database, tokenId: string): Promise<void> {
  await database
    .prepare(`UPDATE api_tokens SET last_used_at = unixepoch() WHERE id = ?`)
    .bind(tokenId)
    .run();
}
