import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { AccessScopePolicy } from "./access-scope-policy";
import type {
  InvitationRecord,
  MembershipRecord,
  OrganizationKind,
  OrganizationRecord,
} from "./access-types";

interface OrganizationRow {
  id: string;
  parent_id: string | null;
  kind: OrganizationKind;
  name: string;
  slug: string;
  path: string;
  depth: number;
  status: "ACTIVE" | "SUSPENDED";
  max_child_organizations: number | null;
  max_members: number | null;
  active_members: number;
  open_dossiers: number;
  version: number;
}

interface InvitationRow {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  role: InvitationRecord["role"];
  status: InvitationRecord["status"];
  expires_at: number;
  created_at: number;
  version: number;
}

export class OrganizationRepository {
  constructor(
    private readonly database = DatabaseManager.getDatabase(),
    private readonly policy = new AccessScopePolicy(),
  ) {}

  async list(actor: WorkspaceActor): Promise<OrganizationRecord[]> {
    const scope = actor.role === "SUPER_ADMIN" ? "1 = 1" : "(organization.path = ? OR organization.path LIKE ?)";
    const statement = this.database.prepare(
      `SELECT organization.*,
         (SELECT count(*) FROM memberships membership
          WHERE membership.organization_id = organization.id AND membership.status = 'ACTIVE') AS active_members,
         (SELECT count(*) FROM dossiers dossier
          WHERE dossier.organization_id = organization.id AND dossier.status NOT IN ('signed', 'lost')) AS open_dossiers
       FROM organizations organization
       WHERE ${scope}
       ORDER BY organization.path`,
    );
    const result = actor.role === "SUPER_ADMIN"
      ? await statement.all<OrganizationRow>()
      : await statement.bind(actor.orgPath, `${actor.orgPath}.%`).all<OrganizationRow>();
    return result.results.map((row) => this.mapOrganization(row));
  }

  async find(actor: WorkspaceActor, id: string): Promise<OrganizationRecord | null> {
    const row = await this.database.prepare(
      `SELECT organization.*,
         (SELECT count(*) FROM memberships membership
          WHERE membership.organization_id = organization.id AND membership.status = 'ACTIVE') AS active_members,
         (SELECT count(*) FROM dossiers dossier
          WHERE dossier.organization_id = organization.id AND dossier.status NOT IN ('signed', 'lost')) AS open_dossiers
       FROM organizations organization WHERE organization.id = ? LIMIT 1`,
    ).bind(id).first<OrganizationRow>();
    if (!row || !this.policy.organizationInScope(actor, row.path)) return null;
    return this.mapOrganization(row);
  }

  async isEffectivelyActive(path: string): Promise<boolean> {
    const row = await this.database.prepare(
      `SELECT count(*) AS suspended_count FROM organizations
       WHERE status = 'SUSPENDED' AND (? = path OR ? LIKE path || '.%')`,
    ).bind(path, path).first<{ suspended_count: number }>();
    return Number(row?.suspended_count ?? 0) === 0;
  }

  async create(
    actor: WorkspaceActor,
    input: {
      parent: OrganizationRecord;
      kind: OrganizationKind;
      name: string;
      slug: string;
      maxChildOrganizations: number | null;
      maxMembers: number | null;
    },
  ): Promise<OrganizationRecord> {
    const childCount = await this.database.prepare(
      `SELECT count(*) AS count FROM organizations WHERE parent_id = ? AND status = 'ACTIVE'`,
    ).bind(input.parent.id).first<{ count: number }>();
    if (
      input.parent.maxChildOrganizations !== null &&
      Number(childCount?.count ?? 0) >= input.parent.maxChildOrganizations
    ) {
      throw new CrmError("CRM_CONFLICT", 409, "maxChildOrganizations");
    }

    const id = randomUUID();
    const path = `${input.parent.path}.${input.slug}_${id.slice(0, 8)}`;
    await this.database.batch([
      this.database.prepare(
        `INSERT INTO organizations (
           id, parent_id, kind, name, slug, path, depth,
           max_child_organizations, max_members
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        input.parent.id,
        input.kind,
        input.name,
        `${input.slug}-${id.slice(0, 8)}`,
        path,
        input.parent.depth + 1,
        input.maxChildOrganizations,
        input.maxMembers,
      ),
      this.audit(actor, input.parent.id, "ORGANIZATION_CREATED", "ORGANIZATION", id, {
        parentId: input.parent.id,
        kind: input.kind,
        name: input.name,
      }),
    ]);
    const created = await this.find(actor, id);
    if (!created) throw new CrmError("CRM_UNAVAILABLE", 503);
    return created;
  }

  async update(
    actor: WorkspaceActor,
    organization: OrganizationRecord,
    input: { status?: "ACTIVE" | "SUSPENDED"; maxChildOrganizations?: number | null; maxMembers?: number | null; version: number },
  ): Promise<OrganizationRecord> {
    const status = input.status ?? organization.status;
    const childLimit = input.maxChildOrganizations === undefined
      ? organization.maxChildOrganizations
      : input.maxChildOrganizations;
    const memberLimit = input.maxMembers === undefined ? organization.maxMembers : input.maxMembers;
    const result = await this.database.batch([
      this.database.prepare(
        `UPDATE organizations SET
           status = ?, max_child_organizations = ?, max_members = ?,
           version = version + 1, updated_at = unixepoch()
         WHERE id = ? AND version = ?`,
      ).bind(status, childLimit, memberLimit, organization.id, input.version),
      this.audit(actor, organization.id, "ORGANIZATION_UPDATED", "ORGANIZATION", organization.id, {
        status,
        maxChildOrganizations: childLimit,
        maxMembers: memberLimit,
      }),
    ]);
    if ((result[0].meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409, "version");
    const updated = await this.find(actor, organization.id);
    if (!updated) throw new CrmError("CRM_NOT_FOUND", 404);
    return updated;
  }

  async listMembers(actor: WorkspaceActor): Promise<MembershipRecord[]> {
    const scope = actor.role === "SUPER_ADMIN" ? "1 = 1" : "(organization.path = ? OR organization.path LIKE ?)";
    const statement = this.database.prepare(
      `SELECT user.id AS user_id, membership.organization_id, organization.name AS organization_name,
         user.display_name, user.email, membership.role, membership.status, membership.version
       FROM memberships membership
       JOIN users user ON user.id = membership.user_id
       JOIN organizations organization ON organization.id = membership.organization_id
       WHERE ${scope}
       ORDER BY user.display_name`,
    );
    const result = actor.role === "SUPER_ADMIN"
      ? await statement.all<MembershipRecord & { user_id: string; organization_id: string; organization_name: string; display_name: string }>()
      : await statement.bind(actor.orgPath, `${actor.orgPath}.%`).all<MembershipRecord & { user_id: string; organization_id: string; organization_name: string; display_name: string }>();
    return result.results.map((row) => ({
      userId: row.user_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      displayName: row.display_name,
      email: row.email,
      role: row.role,
      status: row.status,
      version: row.version,
    }));
  }

  async updateMembership(
    actor: WorkspaceActor,
    organization: OrganizationRecord,
    userId: string,
    status: "ACTIVE" | "SUSPENDED",
    version: number,
  ): Promise<void> {
    if (userId === actor.userId && status === "SUSPENDED") {
      throw new CrmError("CRM_CONFLICT", 409, "status");
    }
    const result = await this.database.batch([
      this.database.prepare(
        `UPDATE memberships SET status = ?, version = version + 1, updated_at = unixepoch()
         WHERE organization_id = ? AND user_id = ? AND version = ?
           AND role NOT IN ('SUPER_ADMIN', 'OPERATOR_FINANCE')`,
      ).bind(status, organization.id, userId, version),
      this.audit(actor, organization.id, "MEMBERSHIP_STATUS_CHANGED", "MEMBERSHIP", userId, {
        status,
      }),
    ]);
    if ((result[0].meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409, "version");
  }

  async listInvitations(actor: WorkspaceActor): Promise<InvitationRecord[]> {
    const scope = actor.role === "SUPER_ADMIN" ? "1 = 1" : "(organization.path = ? OR organization.path LIKE ?)";
    const statement = this.database.prepare(
      `SELECT invitation.*, organization.name AS organization_name
       FROM organization_invitations invitation
       JOIN organizations organization ON organization.id = invitation.organization_id
       WHERE ${scope}
       ORDER BY invitation.created_at DESC`,
    );
    const result = actor.role === "SUPER_ADMIN"
      ? await statement.all<InvitationRow>()
      : await statement.bind(actor.orgPath, `${actor.orgPath}.%`).all<InvitationRow>();
    return result.results.map(this.mapInvitation);
  }

  async createInvitation(
    actor: WorkspaceActor,
    organization: OrganizationRecord,
    email: string,
    role: InvitationRecord["role"],
  ): Promise<InvitationRecord> {
    const memberCount = await this.database.prepare(
      `SELECT
         (SELECT count(*) FROM memberships WHERE organization_id = ? AND status != 'SUSPENDED') +
         (SELECT count(*) FROM organization_invitations
          WHERE organization_id = ? AND status = 'PENDING' AND expires_at > unixepoch()) AS count`,
    ).bind(organization.id, organization.id).first<{ count: number }>();
    if (organization.maxMembers !== null && Number(memberCount?.count ?? 0) >= organization.maxMembers) {
      throw new CrmError("CRM_CONFLICT", 409, "maxMembers");
    }
    const existing = await this.database.prepare(
      `SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1`,
    ).bind(email).first<{ id: string }>();
    if (existing) throw new CrmError("CRM_CONFLICT", 409, "email");

    const id = randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    try {
      await this.database.batch([
        this.database.prepare(
          `INSERT INTO organization_invitations (
             id, organization_id, email, role, invited_by, expires_at
           ) VALUES (?, ?, lower(?), ?, ?, ?)`,
        ).bind(id, organization.id, email, role, actor.userId, expiresAt),
        this.audit(actor, organization.id, "ORGANIZATION_INVITATION_CREATED", "INVITATION", id, {
          email,
          role,
        }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) {
        throw new CrmError("CRM_CONFLICT", 409, "email");
      }
      throw error;
    }
    const invitation = (await this.listInvitations(actor)).find((item) => item.id === id);
    if (!invitation) throw new CrmError("CRM_UNAVAILABLE", 503);
    return invitation;
  }

  async revokeInvitation(actor: WorkspaceActor, id: string, version: number): Promise<void> {
    const invitation = (await this.listInvitations(actor)).find((item) => item.id === id);
    if (!invitation) throw new CrmError("CRM_NOT_FOUND", 404);
    const result = await this.database.prepare(
      `UPDATE organization_invitations SET status = 'REVOKED', version = version + 1,
         updated_at = unixepoch()
       WHERE id = ? AND status = 'PENDING' AND version = ?`,
    ).bind(id, version).run();
    if ((result.meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409, "version");
  }

  private audit(
    actor: WorkspaceActor,
    organizationId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): D1PreparedStatement {
    return this.database.prepare(
      `INSERT INTO audit_events (
         id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(randomUUID(), organizationId, actor.userId, action, resourceType, resourceId, JSON.stringify(metadata));
  }

  private mapOrganization(row: OrganizationRow): OrganizationRecord {
    return {
      id: row.id,
      parentId: row.parent_id,
      kind: row.kind,
      name: row.name,
      slug: row.slug,
      path: row.path,
      depth: row.depth,
      status: row.status,
      maxChildOrganizations: row.max_child_organizations,
      maxMembers: row.max_members,
      activeMembers: Number(row.active_members),
      openDossiers: Number(row.open_dossiers),
      version: row.version,
    };
  }

  private mapInvitation(row: InvitationRow): InvitationRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      email: row.email,
      role: row.role,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      version: row.version,
    };
  }
}
