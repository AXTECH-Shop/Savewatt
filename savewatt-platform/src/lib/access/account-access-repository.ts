import "server-only";

import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { isAppRole, type AppRole } from "@/lib/access-control";
import { isInternalRole } from "@/lib/access/access-surface";

export const REGISTRATION_TYPES = ["CUSTOMER", "PARTNER"] as const;

export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

interface ActiveMembershipRow {
  role: string;
  organization_id: string;
  organization_name: string;
  organization_path: string;
}

export interface ActiveMembership {
  role: AppRole;
  organizationId: string;
  organizationName: string;
  organizationPath: string;
}

export interface RegistrationRequestInput {
  clerkUserId: string;
  email: string;
  displayName: string;
  registrationType: RegistrationType;
}

export interface InternalIdentityInput {
  clerkUserId: string;
  email: string;
  displayName: string;
}

const INTERNAL_ROLES: AppRole[] = ["SUPER_ADMIN", "OPERATOR_FINANCE"];

export function isRegistrationType(value: unknown): value is RegistrationType {
  return typeof value === "string" && REGISTRATION_TYPES.includes(value as RegistrationType);
}

export class AccountAccessRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async findActiveMembership(clerkUserId: string): Promise<ActiveMembership | null> {
    const row = await this.database
      .prepare(
        `SELECT
           membership.role,
           organization.id AS organization_id,
           organization.name AS organization_name,
           organization.path AS organization_path
         FROM memberships membership
         JOIN organizations organization ON organization.id = membership.organization_id
         WHERE membership.user_id = ?
           AND membership.status = 'ACTIVE'
           AND organization.status = 'ACTIVE'
           AND NOT EXISTS (
             SELECT 1 FROM organizations suspended
             WHERE suspended.status = 'SUSPENDED'
               AND (organization.path = suspended.path OR organization.path LIKE suspended.path || '.%')
           )
         ORDER BY CASE membership.role
           WHEN 'SUPER_ADMIN' THEN 1
           WHEN 'OPERATOR_FINANCE' THEN 2
           WHEN 'MASTER_ADMIN' THEN 3
           WHEN 'MASTER_BACKOFFICE' THEN 4
           WHEN 'SUB_REGIE_ADMIN' THEN 5
           WHEN 'TEAM_MANAGER' THEN 6
           WHEN 'APPORTEUR' THEN 7
           WHEN 'READ_ONLY' THEN 8
           WHEN 'CLIENT' THEN 9
           ELSE 10
         END
         LIMIT 1`,
      )
      .bind(clerkUserId)
      .first<ActiveMembershipRow>();

    if (!row || !isAppRole(row.role)) return null;
    return {
      role: row.role,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationPath: row.organization_path,
    };
  }

  async findOrProvisionWhitelistedMembership(
    input: InternalIdentityInput,
  ): Promise<ActiveMembership | null> {
    const membership = await this.findActiveMembership(input.clerkUserId);
    if (membership) return membership;

    const invitedMembership = await this.acceptVerifiedEmailInvitation(input);
    if (invitedMembership) return invitedMembership;

    const whitelistEntry = await this.database
      .prepare(
        `SELECT
           whitelist.role,
           organization.id AS organization_id,
           organization.name AS organization_name,
           organization.path AS organization_path
         FROM internal_user_whitelist whitelist
         JOIN organizations organization ON organization.id = whitelist.organization_id
         WHERE lower(whitelist.email) = lower(?)
           AND whitelist.status = 'ACTIVE'
         LIMIT 1`,
      )
      .bind(input.email)
      .first<ActiveMembershipRow>();

    if (!whitelistEntry || !isAppRole(whitelistEntry.role)) return null;
    if (!INTERNAL_ROLES.includes(whitelistEntry.role)) return null;

    const existingUser = await this.database
      .prepare(`SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1`)
      .bind(input.email)
      .first<{ id: string }>();
    if (existingUser && existingUser.id !== input.clerkUserId) return null;

    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO users (id, email, display_name)
           VALUES (?, lower(?), ?)
           ON CONFLICT(id) DO UPDATE SET
             email = excluded.email,
             display_name = excluded.display_name,
             updated_at = unixepoch()`,
        )
        .bind(input.clerkUserId, input.email, input.displayName),
      this.database
        .prepare(
          `INSERT INTO memberships (organization_id, user_id, role, status)
           VALUES (?, ?, ?, 'ACTIVE')
           ON CONFLICT(organization_id, user_id) DO UPDATE SET
             role = excluded.role,
             status = 'ACTIVE',
             updated_at = unixepoch()`,
        )
        .bind(
          whitelistEntry.organization_id,
          input.clerkUserId,
          whitelistEntry.role,
        ),
    ]);

    return {
      role: whitelistEntry.role,
      organizationId: whitelistEntry.organization_id,
      organizationName: whitelistEntry.organization_name,
      organizationPath: whitelistEntry.organization_path,
    };
  }

  private async acceptVerifiedEmailInvitation(
    input: InternalIdentityInput,
  ): Promise<ActiveMembership | null> {
    const invitation = await this.database
      .prepare(
        `SELECT invitation.id, invitation.organization_id, invitation.role
         FROM organization_invitations invitation
         JOIN organizations organization ON organization.id = invitation.organization_id
         WHERE lower(invitation.email) = lower(?)
           AND invitation.status = 'PENDING'
           AND invitation.expires_at > unixepoch()
           AND organization.status = 'ACTIVE'
           AND NOT EXISTS (
             SELECT 1 FROM organizations suspended
             WHERE suspended.status = 'SUSPENDED'
               AND (organization.path = suspended.path OR organization.path LIKE suspended.path || '.%')
           )
         ORDER BY invitation.created_at DESC
         LIMIT 1`,
      )
      .bind(input.email)
      .first<{ id: string; organization_id: string; role: AppRole }>();
    if (!invitation || !isAppRole(invitation.role)) return null;

    const existingUser = await this.database
      .prepare(`SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1`)
      .bind(input.email)
      .first<{ id: string }>();
    if (existingUser && existingUser.id !== input.clerkUserId) return null;

    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO users (id, email, display_name)
           VALUES (?, lower(?), ?)
           ON CONFLICT(id) DO UPDATE SET email = excluded.email,
             display_name = excluded.display_name, updated_at = unixepoch()`,
        )
        .bind(input.clerkUserId, input.email, input.displayName),
      this.database
        .prepare(
          `UPDATE organization_invitations SET status = 'ACCEPTED', accepted_by = ?,
             accepted_at = unixepoch(), version = version + 1, updated_at = unixepoch()
           WHERE id = ? AND status = 'PENDING' AND expires_at > unixepoch()`,
        )
        .bind(input.clerkUserId, invitation.id),
      this.database
        .prepare(
          `INSERT INTO memberships (organization_id, user_id, role, status)
           SELECT organization_id, ?, role, 'ACTIVE'
           FROM organization_invitations
           WHERE id = ? AND status = 'ACCEPTED' AND accepted_by = ?
           ON CONFLICT(organization_id, user_id) DO UPDATE SET role = excluded.role,
             status = 'ACTIVE', updated_at = unixepoch()`,
        )
        .bind(input.clerkUserId, invitation.id, input.clerkUserId),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) SELECT ?, organization_id, ?, 'ORGANIZATION_INVITATION_ACCEPTED',
             'INVITATION', id, json_object('email', email, 'role', role)
           FROM organization_invitations
           WHERE id = ? AND status = 'ACCEPTED' AND accepted_by = ?`,
        )
        .bind(crypto.randomUUID(), input.clerkUserId, invitation.id, input.clerkUserId),
    ]);
    return this.findActiveMembership(input.clerkUserId);
  }

  async isInternalUserWhitelisted(
    email: string,
    membership: ActiveMembership,
  ): Promise<boolean> {
    if (!isInternalRole(membership.role)) return true;

    const row = await this.database
      .prepare(
        `SELECT id
         FROM internal_user_whitelist
         WHERE lower(email) = lower(?)
           AND role = ?
           AND organization_id = ?
           AND status = 'ACTIVE'
         LIMIT 1`,
      )
      .bind(email, membership.role, membership.organizationId)
      .first<{ id: string }>();
    return Boolean(row);
  }

  async recordPendingRegistration(input: RegistrationRequestInput): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO registration_requests (
           clerk_user_id, email, display_name, account_type, status
         ) VALUES (?, lower(?), ?, ?, 'PENDING')
         ON CONFLICT(clerk_user_id) DO UPDATE SET
           email = excluded.email,
           display_name = excluded.display_name,
           account_type = excluded.account_type,
           updated_at = unixepoch()
         WHERE registration_requests.status = 'PENDING'`,
      )
      .bind(
        input.clerkUserId,
        input.email,
        input.displayName,
        input.registrationType,
      )
      .run();
  }
}
