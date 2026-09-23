import type { DossierStatus } from "@/lib/types";
import { CrmError } from "./crm-errors.ts";

const ALLOWED_TRANSITIONS: Record<DossierStatus, DossierStatus[]> = {
  draft: ["uploaded", "lost"],
  uploaded: ["analyzed", "lost"],
  analyzed: ["proposalReady", "lost"],
  proposalReady: ["lost"],
  sent: ["lost"],
  signed: [],
  lost: [],
};

export class DossierStatusManager {
  assertTransition(current: DossierStatus, next: DossierStatus): void {
    if (current === next) return;
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      throw new CrmError("CRM_CONFLICT", 409, "status");
    }
  }
}
