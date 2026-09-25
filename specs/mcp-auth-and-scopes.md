# SaveWatt MCP — Authentication & Scopes

Last updated: 2026-09-25

## Transport

- Stateless Streamable HTTP, `POST /mcp` on the `savewatt-mcp` Cloudflare Worker (JSON-RPC 2.0).
- No sessions, no SSE in v1; every request is independently authenticated.
- `GET /health` is unauthenticated (liveness only).

## Token model (migration `0016_api_tokens.sql`)

`api_tokens`: `id`, `token_hash` (SHA-256 hex of the secret — plaintext is shown
once at creation and never stored), `kind` (`PAT` | `SERVICE`), `label`,
`owner_user_id`, `organization_id`, `scopes_json`, `status`
(`ACTIVE` | `REVOKED`), `expires_at`, `last_used_at`, `created_by_user_id`,
`created_at`, `revoked_at`.

- Wire format: `Authorization: Bearer swm_<32 random bytes, base64url>`.
- Resolution: hash → lookup (ACTIVE, unexpired) → owner user + ACTIVE
  membership in the token's organization → platform `WorkspaceActor`
  (userId, email, role, orgId, orgPath, scope via `scopeForRole`).
- `last_used_at` updated on successful calls.
- Management CLI: `savewatt-mcp/scripts/create-token.mjs` (wrangler d1 execute,
  local or `--remote`; prints the plaintext once).

## Authorization layers

1. **Token-role gate (admin-first, spec §13.1)** — only `SUPER_ADMIN` and
   `OPERATOR_FINANCE` tokens resolve at all (`401 TOKEN_INVALID`,
   `403 TOKEN_FORBIDDEN_ROLE`).
2. **Per-tool role** — every v1 tool except `audit.search` requires
   `SUPER_ADMIN` (the platform's `CrmScopePolicy` already excludes
   `OPERATOR_FINANCE` from CRM reads, so finance tokens are limited to
   `audit.search`, org-scoped to their own organization).
3. **Per-tool scopes** — tokens carry `scopes_json`; a tool call requires all
   of the tool's scopes (`*` wildcard grants everything):
   `dossiers:read`, `dossiers:write`, `leads:read`, `leads:write`,
   `bills:read`, `bills:write`, `bills:extract`, `offers:read`, `offers:write`,
   `admin:write`, `audit:read`.
4. **Service-layer policy** — after the MCP gates, the platform's own
   `CrmScopePolicy` / `AccessScopePolicy` enforce org-path and ownership rules
   exactly as for UI actors. No MCP-only bypass exists.

## Audit

Every `tools/call` (success or failure) writes one `audit_events` row:
`action = 'MCP_TOOL_CALL'`, `resource_type = 'MCP_TOOL'`,
`resource_id = <tool name>`, `metadata_json = { tool, paramsSha256, result,
errorCode? }`. Parameter *hashes* are logged, never raw arguments (they may
contain personal data). Queryable via `audit.search`.

## Error envelope

- Transport/auth failures: HTTP status (`401 UNAUTHENTICATED`,
  `401 TOKEN_INVALID`, `403 TOKEN_FORBIDDEN_ROLE`).
- Protocol failures: JSON-RPC error objects (`-32700`, `-32600`, `-32601`,
  `-32602`).
- Tool failures: MCP `isError: true` content with `CODE (field): message`
  using the platform's `CrmError` vocabulary (`CRM_INVALID_INPUT`,
  `CRM_NOT_FOUND`, `CRM_CONFLICT`, `CRM_FORBIDDEN`, `CRM_UNAVAILABLE`,
  `OFFER_INPUT_MISSING`, `OFFER_MARGIN_GRID_MISSING`,
  `OFFER_PRICING_PARAMETERS_MISSING`, `SCOPE_MISSING`, `MCP_FORBIDDEN_ROLE`).
- Planned tools: listed in `tools/list` with `_meta.status = "planned"`;
  calling them returns `isError: true` ("planned and not callable in v1").

## Rotation & revocation (operational)

- Tokens can be created with `--expires-days N`; expiry is enforced at
  resolution time.
- Revocation = `UPDATE api_tokens SET status='REVOKED', revoked_at=unixepoch()`.
- High-risk planned tools (wallet, signatures) will additionally require
  per-tool rate limits before GA (spec §7/§15).
