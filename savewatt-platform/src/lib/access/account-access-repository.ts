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
         WHERE membership.user_id = ? AND membership.status = 'ACTIVE'
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
