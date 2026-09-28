import type { WorkspaceActor } from "../access-control";
import { CrmError } from "./crm-errors.ts";

/** Admins of a branch may erase its leads; apporteurs and read-only roles may not. */
const DELETE_ROLES = ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"] as const;

export type DeletionBlocker = "CONVERTING" | "SIGNED" | "COMMISSIONS";

export interface DeletionState {
  leadStatus: string | null;
  dossierStatus: string | null;
  completedSignatures: number;
  commissionLines: number;
}

export function assertCanDelete(actor: WorkspaceActor): void {
  if (!DELETE_ROLES.includes(actor.role as (typeof DELETE_ROLES)[number])) {
    throw new CrmError("CRM_FORBIDDEN", 403);
  }
}

/**
 * A lead is erasable until money or a signature hangs off it: signed dossiers
 * and commission lines are accounting records and must be kept (or reversed).
 */
export function deletionBlocker(state: DeletionState): DeletionBlocker | null {
  if (state.leadStatus === "CONVERTING") return "CONVERTING";
  if (state.dossierStatus === "signed" || state.completedSignatures > 0) return "SIGNED";
  if (state.commissionLines > 0) return "COMMISSIONS";
  return null;
}
