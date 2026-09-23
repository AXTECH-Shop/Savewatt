import "server-only";

import type { WorkspaceActor } from "@/lib/access-control";
import type { DossierStatus } from "@/lib/types";
import { ActivityRepository } from "./activity-repository";
import { CrmError } from "./crm-errors";
import { CrmValidationManager } from "./crm-validation-manager";
import { DossierRepository } from "./dossier-repository";
import { LeadRepository } from "./lead-repository";
import type { LeadStatus, TaskStatus } from "./crm-types";

const LEAD_FILTERS: LeadStatus[] = ["NEW", "QUALIFIED", "CONVERTING", "CONVERTED", "LOST"];
const DOSSIER_FILTERS: DossierStatus[] = [
  "draft",
  "uploaded",
  "analyzed",
  "proposalReady",
  "sent",
  "signed",
  "lost",
];
const TASK_STATUSES: TaskStatus[] = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export class CrmManager {
  constructor(
    private readonly leads = new LeadRepository(),
    private readonly dossiers = new DossierRepository(),
    private readonly activities = new ActivityRepository(),
    private readonly validation = new CrmValidationManager(),
  ) {}

  listLeads(actor: WorkspaceActor, statusValue: string | null) {
    return this.leads.list(actor, this.optionalLeadStatus(statusValue));
  }

  createLead(actor: WorkspaceActor, body: unknown) {
    return this.leads.create(actor, this.validation.createLead(body));
  }

  convertLead(actor: WorkspaceActor, leadId: string) {
    return this.leads.convert(actor, leadId);
  }

  listDossiers(actor: WorkspaceActor, statusValue: string | null) {
    return this.dossiers.list(actor, this.optionalDossierStatus(statusValue));
  }

  getDossier(actor: WorkspaceActor, dossierId: string) {
    return this.dossiers.find(actor, dossierId);
  }

  async createDossier(actor: WorkspaceActor, body: unknown) {
    const input = this.validation.createDossier(body);
    const lead = await this.leads.create(actor, input);
    const converted = await this.leads.convert(actor, lead.id);
    const dossier = await this.dossiers.find(actor, converted.dossierId);
    if (!dossier) throw new CrmError("CRM_NOT_FOUND", 404);
    return dossier;
  }

  updateDossierStatus(
    actor: WorkspaceActor,
    dossierId: string,
    body: unknown,
  ) {
    const value = this.object(body);
    const status = this.requiredDossierStatus(value.status);
    const version = this.requiredVersion(value.version);
    return this.dossiers.updateStatus(actor, dossierId, status, version);
  }

  async getDossierActivity(actor: WorkspaceActor, dossierId: string) {
    const [events, tasks] = await Promise.all([
      this.activities.listEvents(actor, dossierId),
      this.activities.listTasks(actor, dossierId),
    ]);
    return { events, tasks };
  }

  createTask(actor: WorkspaceActor, body: unknown) {
    return this.activities.createTask(actor, this.validation.createTask(body));
  }

  updateTaskStatus(actor: WorkspaceActor, taskId: string, body: unknown) {
    const value = this.object(body);
    if (typeof value.status !== "string" || !TASK_STATUSES.includes(value.status as TaskStatus)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "status");
    }
    return this.activities.updateTaskStatus(
      actor,
      taskId,
      value.status as TaskStatus,
      this.requiredVersion(value.version),
    );
  }

  private optionalLeadStatus(value: string | null): LeadStatus | undefined {
    if (!value) return undefined;
    if (!LEAD_FILTERS.includes(value as LeadStatus)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "status");
    }
    return value as LeadStatus;
  }

  private optionalDossierStatus(value: string | null): DossierStatus | undefined {
    if (!value) return undefined;
    return this.requiredDossierStatus(value);
  }

  private requiredDossierStatus(value: unknown): DossierStatus {
    if (typeof value !== "string" || !DOSSIER_FILTERS.includes(value as DossierStatus)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "status");
    }
    return value as DossierStatus;
  }

  private requiredVersion(value: unknown): number {
    const version = Number(value);
    if (!Number.isInteger(version) || version < 1) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "version");
    }
    return version;
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    }
    return value as Record<string, unknown>;
  }
}

