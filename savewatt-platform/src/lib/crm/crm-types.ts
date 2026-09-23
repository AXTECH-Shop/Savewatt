import type { DossierStatus, Segment } from "@/lib/types";

export const LEAD_STATUSES = ["NEW", "QUALIFIED", "CONVERTING", "CONVERTED", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface LeadRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  ownerName: string;
  legalName: string;
  siren: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  pdl: string | null;
  segment: Segment | null;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  convertedClientId: string | null;
  convertedSiteId: string | null;
  convertedDossierId: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface ClientRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  ownerName: string;
  legalName: string;
  siren: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface DossierSummary {
  id: string;
  organizationId: string;
  clientId: string;
  siteId: string | null;
  ownerUserId: string;
  ownerName: string;
  clientName: string;
  pdl: string | null;
  segment: Segment | null;
  status: DossierStatus;
  nextTask: string | null;
  nextTaskDueAt: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface PipelineDeal {
  id: string;
  client: string;
  owner: string;
  pdl: string | null;
  segment: Segment | null;
  status: DossierStatus;
  annualSavingEur: number | null;
  nextAction: string | null;
  dueAt: number | null;
  dueLabel: string | null;
}

export interface DossierEventRecord {
  id: string;
  dossierId: string;
  actorUserId: string | null;
  actorName: string | null;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface TaskRecord {
  id: string;
  organizationId: string;
  dossierId: string | null;
  clientId: string | null;
  assigneeUserId: string;
  assigneeName: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: number | null;
  completedAt: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateLeadInput {
  legalName: string;
  siren?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  pdl?: string;
  segment?: Segment;
  source?: string;
  notes?: string;
}

export interface CreateDossierInput extends CreateLeadInput {
  segment: Segment;
}

export interface CreateTaskInput {
  dossierId?: string;
  clientId?: string;
  assigneeUserId?: string;
  title: string;
  description?: string;
  dueAt?: number;
}
