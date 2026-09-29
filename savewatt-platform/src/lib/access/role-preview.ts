import "server-only";

import { scopeForRole, type AppRole, type PreviewTarget, type WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";

export { ROLE_PREVIEW_COOKIE } from "./access-surface";

const ROLE_FOR_KIND: Record<string, AppRole> = {
  MASTER: "MASTER_ADMIN",
  SUB_REGIE: "SUB_REGIE_ADMIN",
  TEAM: "TEAM_MANAGER",
};

interface OrganizationRow {
  id: string;
  name: string;
  kind: string;
  path: string;
}

export async function listPreviewTargets(): Promise<PreviewTarget[]> {
  const result = await DatabaseManager.getDatabase()
    .prepare(
      `SELECT id, name, kind, path FROM organizations
       WHERE kind != 'OPERATOR' AND status = 'ACTIVE'
       ORDER BY path`,
    )
    .all<OrganizationRow>();
  return result.results
    .filter((row) => ROLE_FOR_KIND[row.kind])
    .map((row) => ({ id: row.id, name: row.name, role: ROLE_FOR_KIND[row.kind] }));
}

/**
 * Re-scopes a super admin to the organization's admin role so every page and
 * query returns exactly what that organization sees. Writes are blocked in the
 * proxy while the preview cookie is set.
 */
export async function applyRolePreview(actor: WorkspaceActor, organizationId: string): Promise<WorkspaceActor> {
  if (actor.role !== "SUPER_ADMIN") return actor;
  const row = await DatabaseManager.getDatabase()
    .prepare(`SELECT id, name, kind, path FROM organizations WHERE id = ? AND status = 'ACTIVE' LIMIT 1`)
    .bind(organizationId)
    .first<OrganizationRow>();
  const role = row ? ROLE_FOR_KIND[row.kind] : undefined;
  if (!row || !role) return actor;
  return {
    ...actor,
    role,
    scope: scopeForRole(role),
    orgId: row.id,
    orgName: row.name,
    orgPath: row.path,
    preview: { realRole: actor.role, realOrgName: actor.orgName },
  };
}
