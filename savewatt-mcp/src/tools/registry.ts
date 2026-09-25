import type { AppRole } from "@/lib/access-control";
import type { ToolContext } from "../context.ts";

export interface ToolDef {
  name: string;
  description: string;
  /** Release state per spec §15 — planned tools are listed but never callable. */
  status: "live" | "planned";
  readOnly: boolean;
  /** Token scopes required (all of them; "*" wildcard grants everything). */
  scopes: string[];
  /** Roles allowed to call (on top of the v1 token-role gate). */
  roles: AppRole[];
  inputSchema: Record<string, unknown>;
  run?: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
}

const ADMIN: AppRole[] = ["SUPER_ADMIN"];
const ADMIN_AND_FINANCE: AppRole[] = ["SUPER_ADMIN", "OPERATOR_FINANCE"];

export function plannedTool(name: string, description: string): ToolDef {
  return {
    name,
    description: `[PLANNED — not callable in v1] ${description}`,
    status: "planned",
    readOnly: false,
    scopes: [],
    roles: [],
    inputSchema: { type: "object", properties: {} },
  };
}

export { ADMIN, ADMIN_AND_FINANCE };
