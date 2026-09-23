import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "./crm-errors";
import {
  LEAD_IMPORT_MAX_ROWS,
  parseLeadWorkbook,
  validateLeadRow,
  type InvalidLeadRow,
  type LeadImportField,
  type ValidLeadRow,
} from "./lead-import-parser";
import { LeadRepository } from "./lead-repository";

export type ImportRowResult =
  | { line: number; status: "created"; leadId: null }
  | { line: number; status: "skipped"; reason: "duplicate"; fields: LeadImportField[] }
  | { line: number; status: "failed"; fields: LeadImportField[] };

export interface LeadImportResult {
  importId: string;
  replayed: boolean;
  fileName: string | null;
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  rows: ImportRowResult[];
}

interface ImportRunRow {
  id: string;
  idempotency_key: string;
  file_name: string | null;
  total_rows: number;
  created_count: number;
  skipped_count: number;
  failed_count: number;
  row_results_json: string;
  created_at: number;
}

export class LeadImportManager {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly leads = new LeadRepository(),
  ) {}

  async import(
    actor: WorkspaceActor,
    options: { buffer: ArrayBuffer; idempotencyKey: string; fileName: string | null },
  ): Promise<LeadImportResult> {
    this.assertIdempotencyKey(options.idempotencyKey);

    const replayed = await this.findImportRun(actor, options.idempotencyKey);
    if (replayed) return replayed;

    const rawRows = await parseLeadWorkbook(options.buffer);
    if (rawRows.length > LEAD_IMPORT_MAX_ROWS) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    const parsed = rawRows.map(validateLeadRow);

    const valid: ValidLeadRow[] = [];
    const results: ImportRowResult[] = [];
    for (const entry of parsed) {
      if (entry.ok) {
        valid.push(entry.row);
      } else {
        results.push({ line: entry.row.line, status: "failed", fields: entry.row.fields });
      }
    }

    const existing = await this.leads.findExistingKeys(
      actor,
      {
        sirens: valid.map((row) => row.keys.siren).filter((value): value is string => Boolean(value)),
        emails: valid.map((row) => row.keys.email).filter((value): value is string => Boolean(value)),
        phones: valid.map((row) => row.keys.phone).filter((value): value is string => Boolean(value)),
      },
    );

    const toCreate: ValidLeadRow[] = [];
    for (const row of valid) {
      const duplicateFields = this.duplicateFields(row, existing);
      if (duplicateFields.length > 0) {
        results.push({ line: row.line, status: "skipped", reason: "duplicate", fields: duplicateFields });
      } else {
        toCreate.push(row);
      }
    }

    if (toCreate.length > 0) {
      await this.leads.createMany(actor, toCreate.map((row) => row.input));
    }
    for (const row of toCreate) {
      results.push({ line: row.line, status: "created", leadId: null });
    }
    results.sort((a, b) => a.line - b.line);

    const result: LeadImportResult = {
      importId: randomUUID(),
      replayed: false,
      fileName: options.fileName,
      totalRows: rawRows.length,
      createdCount: toCreate.length,
      skippedCount: results.filter((row) => row.status === "skipped").length,
      failedCount: results.filter((row) => row.status === "failed").length,
      rows: results,
    };

    await this.recordImportRun(actor, options, result);
    return result;
  }

  private duplicateFields(
    row: ValidLeadRow,
    existing: { sirens: Set<string>; emails: Set<string>; phones: Set<string> },
  ): LeadImportField[] {
    const fields: LeadImportField[] = [];
    if (row.keys.siren && existing.sirens.has(row.keys.siren)) fields.push("siren");
    if (row.keys.email && existing.emails.has(row.keys.email)) fields.push("contactEmail");
    if (row.keys.phone && existing.phones.has(row.keys.phone)) fields.push("contactPhone");
    return fields;
  }

  private assertIdempotencyKey(value: string): void {
    if (!value || value.length < 8 || value.length > 120) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "idempotencyKey");
    }
  }

  private async findImportRun(actor: WorkspaceActor, idempotencyKey: string): Promise<LeadImportResult | null> {
    const row = await this.database
      .prepare(
        `SELECT * FROM lead_imports
         WHERE organization_id = ? AND idempotency_key = ? LIMIT 1`,
      )
      .bind(actor.orgId, idempotencyKey)
      .first<ImportRunRow>();
    if (!row) return null;
    return {
      importId: row.id,
      replayed: true,
      fileName: row.file_name,
      totalRows: row.total_rows,
      createdCount: row.created_count,
      skippedCount: row.skipped_count,
      failedCount: row.failed_count,
      rows: JSON.parse(row.row_results_json) as ImportRowResult[],
    };
  }

  private async recordImportRun(
    actor: WorkspaceActor,
    options: { idempotencyKey: string; fileName: string | null },
    result: LeadImportResult,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO lead_imports (
           id, organization_id, actor_user_id, idempotency_key, file_name,
           total_rows, created_count, skipped_count, failed_count, row_results_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        result.importId,
        actor.orgId,
        actor.userId,
        options.idempotencyKey,
        options.fileName,
        result.totalRows,
        result.createdCount,
        result.skippedCount,
        result.failedCount,
        JSON.stringify(result.rows),
      )
      .run();
  }
}

export type { InvalidLeadRow, ValidLeadRow };
