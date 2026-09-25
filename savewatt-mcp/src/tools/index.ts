import type { ToolDef } from "./registry.ts";
import { plannedTool } from "./registry.ts";
import { adminTools } from "./admin.ts";
import { billTools } from "./bills.ts";
import { dossierTools, leadTools } from "./core.ts";
import { offerTools } from "./offers.ts";
import { workflowTools } from "./workflow.ts";

/** v1 live bundle (spec §13.3 filtered by the §14–15 release policy). */
export const LIVE_TOOLS: ToolDef[] = [
  ...dossierTools,
  ...leadTools,
  ...workflowTools,
  ...billTools,
  ...offerTools,
  ...adminTools,
];

/** Listed but never callable (services not yet durable/policy-complete). */
export const PLANNED_TOOLS: ToolDef[] = [
  plannedTool("commission_grids.create_version", "Publish a commission grid version (commission persistence not yet durable)."),
  plannedTool("commission_grids.publish_version", "Publish a commission grid version for the network."),
  plannedTool("commission_grids.get_effective", "Read the effective commission grid."),
  plannedTool("impersonation.start", "Start an operator impersonation session."),
  plannedTool("impersonation.stop", "Stop an operator impersonation session."),
  plannedTool("reports.integration_health", "Integration/provider health report."),
  plannedTool("signatures.status", "DocuSeal signature status (dormant provider)."),
  plannedTool("client_offers.send_for_signature", "Send an offer for e-signature (DocuSeal dormant)."),
  plannedTool("wallet.redeem", "Initiate a wallet gift redemption."),
  plannedTool("wallet.balance", "Read wallet balance and transactions."),
  plannedTool("registration_requests.list", "List partner/customer registration requests."),
  plannedTool("registration_requests.approve", "Approve a registration request."),
  plannedTool("registration_requests.reject", "Reject a registration request."),
  plannedTool("organizations.create_branch_node", "Create a sub-régie/team branch node."),
  plannedTool("memberships.invite", "Invite a member into an organization."),
  plannedTool("memberships.update_role", "Update a member's role."),
  plannedTool("clients.create", "Create a client directly (covered today via dossiers.create)."),
  plannedTool("sites.create", "Create a site directly (covered today via dossiers.create)."),
];

export const ALL_TOOLS: ToolDef[] = [...LIVE_TOOLS, ...PLANNED_TOOLS];

/** Name exposed to MCP clients: Claude only accepts [a-zA-Z0-9_-] in tool names. */
export function wireName(name: string): string {
  return name.replace(/\./g, "_");
}

export function findTool(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name || wireName(tool.name) === name);
}
