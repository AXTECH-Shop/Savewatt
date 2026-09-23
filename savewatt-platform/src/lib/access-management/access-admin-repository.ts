import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import type { RegistrationRequestRecord, WhitelistRecord } from "./access-types";

interface RegistrationRow {
  clerk_user_id: string;
  email: string;
  display_name: string;
  account_type: "CUSTOMER" | "PARTNER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: number;
  version: number;
}

interface WhitelistRow {
  id: string;
  email: string;
  role: WhitelistRecord["role"];
  organization_id: string;
  organization_name: string;
  status: WhitelistRecord["status"];
  created_at: number;
}

export class AccessAdminRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async listRegistrations(): Promise<RegistrationRequestRecord[]> {
    const result = await this.database.prepare(
      `SELECT clerk_user_id, email, display_name, account_type, status, created_at, version
       FROM registration_requests
       ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END, created_at DESC`,
    ).all<RegistrationRow>();
    return result.results.map((row) => ({
      clerkUserId: row.clerk_user_id,
      email: row.email,
      displayName: row.display_name,
      accountType: row.account_type,
      status: row.status,
      createdAt: row.created_at,
      version: row.version,
    }));
  }

  async findRegistration(clerkUserId: string): Promise<RegistrationRequestRecord | null> {
    const row = await this.database.prepare(
      `SELECT clerk_user_id, email, display_name, account_type, status, created_at, version
       FROM registration_requests WHERE clerk_user_id = ? LIMIT 1`,
    ).bind(clerkUserId).first<RegistrationRow>();
    if (!row) return null;
    return {
      clerkUserId: row.clerk_user_id,
      email: row.email,
      displayName: row.display_name,
      accountType: row.account_type,
      status: row.status,
      createdAt: row.created_at,
      version: row.version,
    };
  }

  async approvePartner(
    actor: WorkspaceActor,
    request: RegistrationRequestRecord,
    organizationId: string,
    role: string,
  ): Promise<void> {
    await this.withReviewClaim(request, async (claim) => {
      await this.database.batch([
        this.upsertUser(request),
        this.database.prepare(
          `INSERT INTO memberships (organization_id, user_id, role, status)
           SELECT ?, clerk_user_id, ?, 'ACTIVE' FROM registration_requests
           WHERE clerk_user_id = ? AND status = 'PENDING' AND review_claim = ?
           ON CONFLICT(organization_id, user_id) DO UPDATE SET
             role = excluded.role, status = 'ACTIVE', updated_at = unixepoch()`,
        ).bind(organizationId, role, request.clerkUserId, claim),
        this.completeReview(actor, request, claim, "APPROVED", organizationId, null),
        this.audit(actor, organizationId, "REGISTRATION_APPROVED", "REGISTRATION_REQUEST", request.clerkUserId, {
          accountType: request.accountType,
          role,
        }),
      ]);
    });
  }

  async approveCustomer(
    actor: WorkspaceActor,
    request: RegistrationRequestRecord,
    clientId: string,
    organizationId: string,
  ): Promise<void> {
    await this.withReviewClaim(request, async (claim) => {
      const results = await this.database.batch([
        this.upsertUser(request),
        this.database.prepare(
          `INSERT INTO memberships (organization_id, user_id, role, status)
           SELECT ?, clerk_user_id, 'CLIENT', 'ACTIVE' FROM registration_requests
           WHERE clerk_user_id = ? AND status = 'PENDING' AND review_claim = ?
           ON CONFLICT(organization_id, user_id) DO UPDATE SET
             role = 'CLIENT', status = 'ACTIVE', updated_at = unixepoch()`,
        ).bind(organizationId, request.clerkUserId, claim),
        this.database.prepare(
          `UPDATE clients SET customer_user_id = ?, updated_at = unixepoch(), version = version + 1
           WHERE id = ? AND organization_id = ? AND customer_user_id IS NULL`,
        ).bind(request.clerkUserId, clientId, organizationId),
        this.completeReview(actor, request, claim, "APPROVED", organizationId, null),
        this.audit(actor, organizationId, "REGISTRATION_APPROVED", "REGISTRATION_REQUEST", request.clerkUserId, {
          accountType: request.accountType,
          clientId,
        }),
      ]);
      if ((results[2].meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409, "clientId");
    });
  }

  async reject(actor: WorkspaceActor, request: RegistrationRequestRecord, reason: string | null): Promise<void> {
    await this.withReviewClaim(request, async (claim) => {
      await this.database.batch([
        this.completeReview(actor, request, claim, "REJECTED", null, reason),
        this.audit(actor, actor.orgId, "REGISTRATION_REJECTED", "REGISTRATION_REQUEST", request.clerkUserId, {
          accountType: request.accountType,
          reason,
        }),
      ]);
    });
  }

  async clientOrganization(clientId: string): Promise<string | null> {
    const row = await this.database.prepare(
      `SELECT organization_id FROM clients WHERE id = ? LIMIT 1`,
    ).bind(clientId).first<{ organization_id: string }>();
    return row?.organization_id ?? null;
  }

  async listWhitelist(): Promise<WhitelistRecord[]> {
    const result = await this.database.prepare(
      `SELECT whitelist.*, organization.name AS organization_name
       FROM internal_user_whitelist whitelist
       JOIN organizations organization ON organization.id = whitelist.organization_id
       ORDER BY whitelist.created_at DESC`,
    ).all<WhitelistRow>();
    return result.results.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  async addWhitelist(
    actor: WorkspaceActor,
    email: string,
    role: WhitelistRecord["role"],
    organizationId: string,
  ): Promise<WhitelistRecord> {
    const id = randomUUID();
    try {
      await this.database.batch([
        this.database.prepare(
          `INSERT INTO internal_user_whitelist (
             id, email, role, organization_id, status, created_by
           ) VALUES (?, lower(?), ?, ?, 'ACTIVE', ?)
           ON CONFLICT DO UPDATE SET role = excluded.role,
             organization_id = excluded.organization_id, status = 'ACTIVE', updated_at = unixepoch()`,
        ).bind(id, email, role, organizationId, actor.userId),
        this.audit(actor, organizationId, "INTERNAL_WHITELIST_UPSERTED", "INTERNAL_WHITELIST", id, {
          email,
          role,
        }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("FOREIGN KEY")) {
        throw new CrmError("CRM_NOT_FOUND", 404, "organizationId");
      }
      throw error;
    }
    const record = (await this.listWhitelist()).find((item) => item.email === email);
    if (!record) throw new CrmError("CRM_UNAVAILABLE", 503);
    return record;
  }

  async revokeWhitelist(actor: WorkspaceActor, id: string): Promise<void> {
    const result = await this.database.prepare(
      `UPDATE internal_user_whitelist SET status = 'REVOKED', updated_at = unixepoch()
       WHERE id = ? AND status = 'ACTIVE'`,
    ).bind(id).run();
    if ((result.meta.changes ?? 0) !== 1) throw new CrmError("CRM_NOT_FOUND", 404);
    await this.audit(actor, actor.orgId, "INTERNAL_WHITELIST_REVOKED", "INTERNAL_WHITELIST", id, {}).run();
  }

  private async withReviewClaim(
    request: RegistrationRequestRecord,
    work: (claim: string) => Promise<void>,
  ): Promise<void> {
    const claim = randomUUID();
    const claimed = await this.database.prepare(
      `UPDATE registration_requests SET review_claim = ?
       WHERE clerk_user_id = ? AND status = 'PENDING' AND version = ? AND review_claim IS NULL`,
    ).bind(claim, request.clerkUserId, request.version).run();
    if ((claimed.meta.changes ?? 0) !== 1) throw new CrmError("CRM_CONFLICT", 409, "version");
    try {
      await work(claim);
    } catch (error) {
      await this.database.prepare(
        `UPDATE registration_requests SET review_claim = NULL
         WHERE clerk_user_id = ? AND status = 'PENDING' AND review_claim = ?`,
      ).bind(request.clerkUserId, claim).run();
      throw error;
    }
  }

  private upsertUser(request: RegistrationRequestRecord): D1PreparedStatement {
    return this.database.prepare(
      `INSERT INTO users (id, email, display_name)
       SELECT clerk_user_id, email, display_name FROM registration_requests
       WHERE clerk_user_id = ? AND status = 'PENDING' AND review_claim IS NOT NULL
       ON CONFLICT(id) DO UPDATE SET email = excluded.email,
         display_name = excluded.display_name, updated_at = unixepoch()`,
    ).bind(request.clerkUserId);
  }

  private completeReview(
    actor: WorkspaceActor,
    request: RegistrationRequestRecord,
    claim: string,
    status: "APPROVED" | "REJECTED",
    organizationId: string | null,
    reason: string | null,
  ): D1PreparedStatement {
    return this.database.prepare(
      `UPDATE registration_requests SET status = ?, reviewed_by = ?, reviewed_at = unixepoch(),
         target_organization_id = ?, decision_reason = ?, review_claim = NULL,
         version = version + 1, updated_at = unixepoch()
       WHERE clerk_user_id = ? AND status = 'PENDING' AND review_claim = ?`,
    ).bind(status, actor.userId, organizationId, reason, request.clerkUserId, claim);
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
}
