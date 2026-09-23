import "server-only";

import type { WorkspaceActor } from "@/lib/access-control";
import { CrmError } from "@/lib/crm/crm-errors";
import { AccessScopePolicy } from "./access-scope-policy";
import { AccessValidationManager } from "./access-validation-manager";
import { OrganizationRepository } from "./organization-repository";

export class OrganizationManager {
  constructor(
    private readonly repository = new OrganizationRepository(),
    private readonly policy = new AccessScopePolicy(),
    private readonly validation = new AccessValidationManager(),
  ) {}

  list(actor: WorkspaceActor) {
    this.requireNetworkManager(actor);
    return this.repository.list(actor);
  }

  async create(actor: WorkspaceActor, body: unknown) {
    this.requireNetworkManager(actor);
    const input = this.object(body);
    const parentId = this.validation.identifier(input.parentId, "parentId");
    const parent = await this.repository.find(actor, parentId);
    if (!parent) throw new CrmError("CRM_NOT_FOUND", 404, "parentId");
    const kind = this.validation.kind(input.kind);
    if (!this.policy.canCreateChild(actor, parent.path, parent.kind, kind)) {
      throw new CrmError("CRM_FORBIDDEN", 403, "kind");
    }
    if (parent.status !== "ACTIVE" || !(await this.repository.isEffectivelyActive(parent.path))) {
      throw new CrmError("CRM_CONFLICT", 409, "parentId");
    }
    const name = this.validation.text(input.name, "name", 120);
    return this.repository.create(actor, {
      parent,
      kind,
      name,
      slug: this.validation.slug(name),
      maxChildOrganizations: this.validation.limit(input.maxChildOrganizations, "maxChildOrganizations"),
      maxMembers: this.validation.limit(input.maxMembers, "maxMembers"),
    });
  }

  async update(actor: WorkspaceActor, idValue: unknown, body: unknown) {
    this.requireNetworkManager(actor);
    const id = this.validation.identifier(idValue);
    const organization = await this.repository.find(actor, id);
    if (!organization) throw new CrmError("CRM_NOT_FOUND", 404);
    if (organization.kind === "OPERATOR" && actor.role !== "SUPER_ADMIN") {
      throw new CrmError("CRM_FORBIDDEN", 403);
    }
    const input = this.object(body);
    const status = input.status === undefined
      ? undefined
      : input.status === "ACTIVE" || input.status === "SUSPENDED"
        ? input.status
        : (() => { throw new CrmError("CRM_INVALID_INPUT", 400, "status"); })();
    return this.repository.update(actor, organization, {
      status,
      maxChildOrganizations: input.maxChildOrganizations === undefined
        ? undefined
        : this.validation.limit(input.maxChildOrganizations, "maxChildOrganizations"),
      maxMembers: input.maxMembers === undefined
        ? undefined
        : this.validation.limit(input.maxMembers, "maxMembers"),
      version: this.validation.version(input.version),
    });
  }

  async accessSnapshot(actor: WorkspaceActor) {
    this.requireNetworkManager(actor);
    const [organizations, members, invitations] = await Promise.all([
      this.repository.list(actor),
      this.repository.listMembers(actor),
      this.repository.listInvitations(actor),
    ]);
    return { organizations, members, invitations };
  }

  async invite(actor: WorkspaceActor, body: unknown) {
    this.requireNetworkManager(actor);
    const input = this.object(body);
    const organizationId = this.validation.identifier(input.organizationId, "organizationId");
    const organization = await this.repository.find(actor, organizationId);
    if (!organization) throw new CrmError("CRM_NOT_FOUND", 404, "organizationId");
    if (!(await this.repository.isEffectivelyActive(organization.path))) {
      throw new CrmError("CRM_CONFLICT", 409, "organizationId");
    }
    const role = this.validation.role(input.role);
    if (role === "SUPER_ADMIN" || role === "OPERATOR_FINANCE" || role === "CLIENT") {
      throw new CrmError("CRM_FORBIDDEN", 403, "role");
    }
    if (!this.policy.canInvite(actor, organization.path, organization.kind, role)) {
      throw new CrmError("CRM_FORBIDDEN", 403, "role");
    }
    return this.repository.createInvitation(actor, organization, this.validation.email(input.email), role);
  }

  async revokeInvitation(actor: WorkspaceActor, idValue: unknown, body: unknown) {
    this.requireNetworkManager(actor);
    const input = this.object(body);
    await this.repository.revokeInvitation(
      actor,
      this.validation.identifier(idValue),
      this.validation.version(input.version),
    );
  }

  async updateMembership(actor: WorkspaceActor, userIdValue: unknown, body: unknown) {
    this.requireNetworkManager(actor);
    const input = this.object(body);
    const organizationId = this.validation.identifier(input.organizationId, "organizationId");
    const organization = await this.repository.find(actor, organizationId);
    if (!organization) throw new CrmError("CRM_NOT_FOUND", 404, "organizationId");
    const status = input.status;
    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      throw new CrmError("CRM_INVALID_INPUT", 400, "status");
    }
    await this.repository.updateMembership(
      actor,
      organization,
      this.validation.identifier(userIdValue, "userId"),
      status,
      this.validation.version(input.version),
    );
  }

  private requireNetworkManager(actor: WorkspaceActor): void {
    if (!["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role)) {
      throw new CrmError("CRM_FORBIDDEN", 403);
    }
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    }
    return value as Record<string, unknown>;
  }
}
