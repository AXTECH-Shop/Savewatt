import type { DossierStatus } from "../types.ts";

/**
 * Commercial workflow: the pipeline stages (dossier statuses) with their
 * labels, display order, board visibility and target SLA. Stage keys are fixed
 * (they are dossier statuses the platform transitions between); everything
 * else is configurable and versioned per organization.
 */
export interface WorkflowStage {
  key: DossierStatus;
  labelFr: string;
  labelEn: string;
  /** Target time spent in the stage, in hours; null when not tracked. */
  slaHours: number | null;
  /** Shown as a column on the pipeline board. */
  visible: boolean;
}

export const WORKFLOW_STAGE_KEYS: readonly DossierStatus[] = [
  "draft",
  "uploaded",
  "analyzed",
  "proposalReady",
  "sent",
  "signed",
  "lost",
];

export const DEFAULT_WORKFLOW_STAGES: readonly WorkflowStage[] = [
  { key: "draft", labelFr: "Brouillon", labelEn: "Draft", slaHours: 24, visible: true },
  { key: "uploaded", labelFr: "Documents reçus", labelEn: "Documents received", slaHours: 24, visible: true },
  { key: "analyzed", labelFr: "Analyse prête", labelEn: "Analysis ready", slaHours: 8, visible: true },
  { key: "proposalReady", labelFr: "Offre prête", labelEn: "Offer ready", slaHours: 8, visible: true },
  { key: "sent", labelFr: "En signature", labelEn: "Awaiting signature", slaHours: 72, visible: true },
  { key: "signed", labelFr: "Signé", labelEn: "Signed", slaHours: null, visible: true },
  { key: "lost", labelFr: "Perdu", labelEn: "Lost", slaHours: null, visible: false },
];

export const MAX_STAGE_LABEL_LENGTH = 60;
export const MAX_SLA_HOURS = 8_760;

export class WorkflowStageError extends Error {
  readonly field: string;

  constructor(field: string) {
    super("WORKFLOW_INVALID_STAGES");
    this.name = "WorkflowStageError";
    this.field = field;
  }
}

function label(value: unknown, field: string): string {
  if (typeof value !== "string") throw new WorkflowStageError(field);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_STAGE_LABEL_LENGTH) throw new WorkflowStageError(field);
  return trimmed;
}

/**
 * Validates untrusted input into an ordered stage list. Every stage key must
 * appear exactly once; labels are required in both languages.
 */
export function parseWorkflowStages(input: unknown): WorkflowStage[] {
  if (!Array.isArray(input) || input.length !== WORKFLOW_STAGE_KEYS.length) {
    throw new WorkflowStageError("stages");
  }
  const seen = new Set<string>();
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new WorkflowStageError(`stages.${index}`);
    const stage = raw as Record<string, unknown>;
    const key = stage.key;
    if (typeof key !== "string" || !WORKFLOW_STAGE_KEYS.includes(key as DossierStatus) || seen.has(key)) {
      throw new WorkflowStageError(`stages.${index}.key`);
    }
    seen.add(key);
    const sla = stage.slaHours;
    if (
      sla !== null &&
      sla !== undefined &&
      !(typeof sla === "number" && Number.isInteger(sla) && sla >= 1 && sla <= MAX_SLA_HOURS)
    ) {
      throw new WorkflowStageError(`stages.${index}.slaHours`);
    }
    return {
      key: key as DossierStatus,
      labelFr: label(stage.labelFr, `stages.${index}.labelFr`),
      labelEn: label(stage.labelEn, `stages.${index}.labelEn`),
      slaHours: typeof sla === "number" ? sla : null,
      visible: stage.visible !== false,
    };
  });
}

/** Stored JSON → stages, falling back to the defaults if the payload is unreadable. */
export function readStoredStages(json: string): WorkflowStage[] {
  try {
    return parseWorkflowStages(JSON.parse(json));
  } catch {
    return DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage }));
  }
}

/** Fields that differ between two versions, per stage key (for history display). */
export function diffWorkflowStages(previous: WorkflowStage[], next: WorkflowStage[]): string[] {
  const changes: string[] = [];
  if (previous.map((stage) => stage.key).join() !== next.map((stage) => stage.key).join()) {
    changes.push("order");
  }
  for (const stage of next) {
    const before = previous.find((candidate) => candidate.key === stage.key);
    if (!before) continue;
    for (const field of ["labelFr", "labelEn", "slaHours", "visible"] as const) {
      if (before[field] !== stage[field]) changes.push(`${stage.key}.${field}`);
    }
  }
  return changes;
}
