import "server-only";

import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "./crm-errors";
import { parseLeadWorkbook } from "./lead-import-parser";
import { LEAD_IMPORT_MAX_ROWS, LeadRowImporter, type LeadImportResult } from "./lead-import-rows";
import { LeadRepository } from "./lead-repository";

export type { ImportRowResult, LeadImportResult } from "./lead-import-rows";
export type { InvalidLeadRow, ValidLeadRow } from "./lead-import-rows";

export class LeadImportManager {
  private readonly rows: LeadRowImporter;

  constructor(
    database: D1Database = DatabaseManager.getDatabase(),
    leads = new LeadRepository(),
  ) {
    this.rows = new LeadRowImporter(database, leads);
  }

  async import(
    actor: WorkspaceActor,
    options: { buffer: ArrayBuffer; idempotencyKey: string; fileName: string | null },
  ): Promise<LeadImportResult> {
    if (!options.idempotencyKey || options.idempotencyKey.length < 8 || options.idempotencyKey.length > 120) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "idempotencyKey");
    }
    const rows = await parseLeadWorkbook(options.buffer);
    if (rows.length > LEAD_IMPORT_MAX_ROWS) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    return this.rows.importRows(actor, { rows, idempotencyKey: options.idempotencyKey, fileName: options.fileName });
  }
}
