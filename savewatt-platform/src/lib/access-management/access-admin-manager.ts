import "server-only";

import type { WorkspaceActor } from "@/lib/access-control";
import { CrmError } from "@/lib/crm/crm-errors";
import { AccessAdminRepository } from "./access-admin-repository";
import { AccessScopePolicy } from "./access-scope-policy";
import { AccessValidationManager } from "./access-validation-manager";
import { OrganizationRepository } from "./organization-repository";

export class AccessAdminManager {
  constructor(
    private readonly repository = new AccessAdminRepository(),
    private readonly organizations = new OrganizationRepository(),
    private readonly policy = new AccessScopePolicy(),
    private readonly validation = new AccessValidationManager(),
  ) {}

  async snapshot(actor: WorkspaceActor) {
    this.requireSuperAdmin(actor);
    const [registrations, whitelist, organizations] = await Promise.all([
      this.repository.listRegistrations(),
      this.repository.listWhitelist(),
      this.organizations.list(actor),
    ]);
    return { registrations, whitelist, organizations };
  }

  async decide(actor: WorkspaceActor, idValue: unknown, body: unknown) {
    this.requireSuperAdmin(actor);
    const clerkUserId = this.validation.identifier(idValue, "clerkUserId");
    const input = this.object(body);
    const request = await this.repository.findRegistration(clerkUserId);
    if (!request) throw new CrmError("CRM_NOT_FOUND", 404);
    if (request.status !== "PENDING") throw new CrmError("CRM_CONFLICT", 409, "status");
    if (this.validation.version(input.version) !== request.version) {
      throw new CrmError("CRM_CONFLICT", 409, "version");
    }

    if (input.decision === "REJECTED") {
      await this.repository.reject(
        actor,
        request,
        this.validation.optionalText(input.reason, "reason", 500),
      );
      return;
    }
    if (input.decision !== "APPROVED") {
      throw new CrmError("CRM_INVALID_INPUT", 400, "decision");
    }

    if (request.accountType === "CUSTOMER") {
      const clientId = this.validation.identifier(input.clientId, "clientId");
      const organizationId = await this.repository.clientOrganization(clientId);
      if (!organizationId) throw new CrmError("CRM_NOT_FOUND", 404, "clientId");
      await this.repository.approveCustomer(actor, request, clientId, organizationId);
      return;
    }

    const organizationId = this.validation.identifier(input.organizationId, "organizationId");
    const organization = await this.organizations.find(actor, organizationId);
    if (
      !organization ||
      organization.status !== "ACTIVE" ||
      !(await this.organizations.isEffectivelyActive(organization.path))
    ) {
      throw new CrmError("CRM_NOT_FOUND", 404, "organizationId");
    }
    const role = this.validation.role(input.role);
    if (role === "SUPER_ADMIN" || role === "OPERATOR_FINANCE" || role === "CLIENT") {
      throw new CrmError("CRM_FORBIDDEN", 403, "role");
    }
    if (!this.policy.canInvite(actor, organization.path, organization.kind, role)) {
      throw new CrmError("CRM_FORBIDDEN", 403, "role");
    }
    await this.repository.approvePartner(actor, request, organizationId, role);
  }

  async addWhitelist(actor: WorkspaceActor, body: unknown) {
    this.requireSuperAdmin(actor);
    const input = this.object(body);
    const role = this.validation.role(input.role);
    if (role !== "SUPER_ADMIN" && role !== "OPERATOR_FINANCE") {
      throw new CrmError("CRM_INVALID_INPUT", 400, "role");
    }
    const organizationId = this.validation.identifier(input.organizationId, "organizationId");
    const organization = await this.organizations.find(actor, organizationId);
    if (!organization || organization.kind !== "OPERATOR") {
      throw new CrmError("CRM_INVALID_INPUT", 400, "organizationId");
    }
    return this.repository.addWhitelist(
      actor,
      this.validation.email(input.email),
      role,
      organizationId,
    );
  }

  async revokeWhitelist(actor: WorkspaceActor, idValue: unknown) {
    this.requireSuperAdmin(actor);
    await this.repository.revokeWhitelist(actor, this.validation.identifier(idValue));
  }

  private requireSuperAdmin(actor: WorkspaceActor): void {
    if (actor.role !== "SUPER_ADMIN") throw new CrmError("CRM_FORBIDDEN", 403);
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    }
    return value as Record<string, unknown>;
  }
}
