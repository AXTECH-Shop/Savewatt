import { CrmError } from "@/lib/crm/crm-errors";
import { recordToolCall } from "./audit.ts";
import { assertScopes, McpAuthError, resolveBearerToken, touchToken, type ResolvedToken } from "./auth.ts";
import { buildToolContext, type McpEnv } from "./context.ts";
import {
  isNotification,
  isValidEnvelope,
  JSONRPC_INVALID_PARAMS,
  JSONRPC_INVALID_REQUEST,
  JSONRPC_METHOD_NOT_FOUND,
  JSONRPC_PARSE_ERROR,
  jsonRpcError,
  jsonRpcResult,
  toolError,
  toolResult,
  type JsonRpcRequest,
} from "./jsonrpc.ts";
import {
  DEFAULT_CLERK_ISSUER,
  looksLikeJwt,
  protectedResourceMetadata,
  resolveOAuthActor,
  verifyClerkJwt,
  wwwAuthenticate,
} from "./oauth.ts";
import { handleFileDownload, handleUploadPage } from "./public-pages.ts";
import { LIVE_TOOLS, findTool, wireName } from "./tools/index.ts";

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "savewatt-mcp", title: "SaveWatt", version: "0.2.0" };

const INSTRUCTIONS = `SaveWatt operator tools (French B2B electricity brokerage; SaveWatt never sells energy).
Typical flows:
1. Leads from a spreadsheet: read the Excel/CSV the user shares, map columns, call leads_import (one idempotencyKey per file). Then leads_list / pipeline_summary.
2. Ask a lead for their bill: documents_request_from_client (leadId or dossierId) emails a secure upload link; uploads appear in dossiers_activity.
3. Bill → offer: if the user attached the bill in this chat, read it, show the key figures (PDL, power, cadrans kWh + unit prices, subscription), and after they confirm call bills_submit_reading. (If you prefer the platform OCR, call documents_create_upload_link and then bills_extract + bills_validate.)
   Then supplier_offers_create_manual (Symphonics terms: électron €/MWh per cadran, CEE, capacité, abonnement, term) → comparisons_run (preview) → client_offers_create → client_offers_generate_pdf (returns download links for the marketing one-pager and the budget prévisionnel).
4. Send: client_offers_send (state QUEUED until delivery is confirmed; APPROVAL_REQUIRED versions need client_offers_approve first). Track with client_offers_list, dossiers_activity, pipeline_summary.
Never show électron/margin internals to clients; customer documents only contain final prices.`;

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "access-control-expose-headers": "www-authenticate",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function authenticate(env: McpEnv, authorization: string | null): Promise<ResolvedToken> {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (token && looksLikeJwt(token)) {
    const claims = await verifyClerkJwt(token, env.CLERK_ISSUER ?? DEFAULT_CLERK_ISSUER);
    return resolveOAuthActor(env, claims);
  }
  return resolveBearerToken(env.DB, authorization);
}

export default {
  async fetch(request: Request, env: McpEnv): Promise<Response> {
    const url = new URL(request.url);
    const origin = url.origin;
    const issuer = env.CLERK_ISSUER ?? DEFAULT_CLERK_ISSUER;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (url.pathname === "/health") return Response.json({ ok: true, server: SERVER_INFO });

    if (url.pathname.startsWith("/.well-known/oauth-protected-resource")) {
      return withCors(Response.json(protectedResourceMetadata(origin, issuer)));
    }
    if (url.pathname === "/.well-known/oauth-authorization-server") {
      // Older MCP clients look for AS metadata on the resource host: mirror Clerk's.
      const upstream = await fetch(`${issuer}/.well-known/oauth-authorization-server`);
      return withCors(new Response(upstream.body, { status: upstream.status, headers: { "content-type": "application/json" } }));
    }

    const upload = url.pathname.match(/^\/u\/([\w.-]+)$/);
    if (upload) return handleUploadPage(request, env, upload[1]);
    const file = url.pathname.match(/^\/f\/([\w.-]+)$/);
    if (file && request.method === "GET") return handleFileDownload(env, file[1]);

    if (url.pathname !== "/mcp") {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (request.method !== "POST") {
      return withCors(Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers: { allow: "POST" } }));
    }

    let resolved: ResolvedToken;
    try {
      resolved = await authenticate(env, request.headers.get("authorization"));
    } catch (error) {
      if (error instanceof McpAuthError) {
        const headers: Record<string, string> = {};
        if (error.status === 401) headers["www-authenticate"] = wwwAuthenticate(origin);
        return withCors(Response.json({ error: error.code }, { status: error.status, headers }));
      }
      throw error;
    }
    const { actor, token } = resolved;

    let body: JsonRpcRequest;
    try {
      body = (await request.json()) as JsonRpcRequest;
    } catch {
      return withCors(jsonRpcError(null, JSONRPC_PARSE_ERROR, "Parse error"));
    }
    if (!isValidEnvelope(body)) {
      return withCors(jsonRpcError(body.id ?? null, JSONRPC_INVALID_REQUEST, "Invalid JSON-RPC 2.0 request"));
    }

    // Notifications: processed, never answered (202).
    if (isNotification(body)) {
      return withCors(new Response(null, { status: 202 }));
    }

    switch (body.method) {
      case "initialize": {
        const requested = (body.params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
        const protocolVersion =
          typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
            ? requested
            : SUPPORTED_PROTOCOL_VERSIONS[0];
        return withCors(
          jsonRpcResult(body.id!, {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
            instructions: INSTRUCTIONS,
          }),
        );
      }
      case "ping":
        return withCors(jsonRpcResult(body.id!, {}));
      case "tools/list":
        return withCors(
          jsonRpcResult(body.id!, {
            tools: LIVE_TOOLS.filter((tool) => tool.roles.includes(actor.role)).map((tool) => ({
              name: wireName(tool.name),
              description: tool.description,
              inputSchema: tool.inputSchema,
              annotations: {
                readOnlyHint: tool.readOnly,
                destructiveHint: false,
                idempotentHint: tool.readOnly,
                openWorldHint: tool.name.endsWith(".send") || tool.name === "documents.request_from_client",
              },
              _meta: { requiredScopes: tool.scopes },
            })),
          }),
        );
      case "tools/call":
        return withCors(await handleToolCall(env, actor, token, body, origin));
      default:
        return withCors(jsonRpcError(body.id!, JSONRPC_METHOD_NOT_FOUND, `Method not found: ${body.method}`));
    }
  },
};

async function handleToolCall(
  env: McpEnv,
  actor: ResolvedToken["actor"],
  token: ResolvedToken["token"],
  body: JsonRpcRequest,
  origin: string,
): Promise<Response> {
  const params = (body.params ?? {}) as { name?: unknown; arguments?: unknown };
  const name = typeof params.name === "string" ? params.name : "";
  const tool = findTool(name);
  if (!tool) {
    return jsonRpcError(body.id!, JSONRPC_INVALID_PARAMS, `Unknown tool: ${name}`);
  }
  if (tool.status !== "live" || !tool.run) {
    return jsonRpcResult(body.id!, toolError(`Tool '${name}' is planned and not callable in v1.`));
  }
  if (!tool.roles.includes(actor.role)) {
    return jsonRpcResult(body.id!, toolError(`Role ${actor.role} may not call ${name}.`, { code: "MCP_FORBIDDEN_ROLE" }));
  }
  try {
    assertScopes(token, tool.scopes);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return jsonRpcResult(body.id!, toolError(`Token missing required scope for ${name}.`, { code: error.code }));
    }
    throw error;
  }

  const args = (params.arguments ?? {}) as Record<string, unknown>;
  const ctx = buildToolContext(env, actor, token, origin);
  try {
    const data = await tool.run(ctx, args);
    await Promise.all([
      recordToolCall(env.DB, actor, tool.name, args, { result: "ok" }),
      token.kind === "OAUTH" ? Promise.resolve() : touchToken(env.DB, token.id),
    ]);
    return jsonRpcResult(body.id!, toolResult(data));
  } catch (error) {
    const code = error instanceof CrmError ? error.code : "MCP_TOOL_ERROR";
    const field = error instanceof CrmError && error.field ? ` (${error.field})` : "";
    const message = error instanceof Error ? error.message : String(error);
    await recordToolCall(env.DB, actor, tool.name, args, { result: "error", errorCode: code }).catch(() => {});
    return jsonRpcResult(body.id!, toolError(`${code}${field}: ${message}`, { code }));
  }
}
