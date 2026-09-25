/** Minimal JSON-RPC 2.0 envelope for the MCP Streamable HTTP transport (stateless, POST-only). */

export const JSONRPC_PARSE_ERROR = -32700;
export const JSONRPC_INVALID_REQUEST = -32600;
export const JSONRPC_METHOD_NOT_FOUND = -32601;
export const JSONRPC_INVALID_PARAMS = -32602;
export const JSONRPC_INTERNAL_ERROR = -32603;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

export function jsonRpcResult(id: string | number | null, result: unknown): Response {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

export function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): Response {
  return Response.json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  });
}

export function isNotification(request: JsonRpcRequest): boolean {
  return request.id === undefined || request.id === null;
}

export function isValidEnvelope(request: JsonRpcRequest): boolean {
  return request.jsonrpc === "2.0" && typeof request.method === "string" && request.method.length > 0;
}

/** MCP tool success envelope (content + structuredContent per MCP 2025-06-18). */
export function toolResult(data: unknown): { content: { type: string; text: string }[]; structuredContent: unknown } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function toolError(message: string, data?: unknown): { content: { type: string; text: string }[]; isError: true; data?: unknown } {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
    ...(data !== undefined ? { data } : {}),
  };
}
