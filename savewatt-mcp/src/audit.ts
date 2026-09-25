import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";

/** One audit_events row per tools/call, following the platform's audit conventions. */
export async function recordToolCall(
  database: D1Database,
  actor: WorkspaceActor,
  toolName: string,
  params: unknown,
  outcome: { result: "ok" | "error"; errorCode?: string },
): Promise<void> {
  const paramsSha256 = createHash("sha256")
    .update(JSON.stringify(params ?? null))
    .digest("hex");
  await database
    .prepare(
      `INSERT INTO audit_events (
         id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
       ) VALUES (?, ?, ?, 'MCP_TOOL_CALL', 'MCP_TOOL', ?, ?)`,
    )
    .bind(
      randomUUID(),
      actor.orgId,
      actor.userId,
      toolName,
      JSON.stringify({
        tool: toolName,
        paramsSha256,
        result: outcome.result,
        ...(outcome.errorCode ? { errorCode: outcome.errorCode } : {}),
      }),
    )
    .run();
}
