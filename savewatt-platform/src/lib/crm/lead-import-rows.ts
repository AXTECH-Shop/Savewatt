import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { CrmError } from "./crm-errors.ts";
import type { CreateLeadInput } from "./crm-types";
import type { LeadRepository } from "./lead-repository";

/**
 * Row-level lead import: validation, de-duplication and the idempotent import
 * run record. Kept free of the spreadsheet parser (exceljs) so non-Next
 * callers (the MCP worker) can import already-parsed rows with the same rules.
 */

export const LEAD_IMPORT_MAX_ROWS = 500;

export interface RawImportRow {
  line: number;
  values: Record<string, unknown>;
}

export type LeadImportField =
  | "legalName"
  | "siren"
  | "contactEmail"
  | "contactPhone"
  | "pdl"
  | "segment"
  | "annualSpend"
  | "notes";

export interface ValidLeadRow {
  line: number;
  input: CreateLeadInput;
  keys: { siren: string | null; email: string | null; phone: string | null };
}

export interface InvalidLeadRow {
  line: number;
  fields: LeadImportField[];
}

export type ParsedLeadRow = { ok: true; row: ValidLeadRow } | { ok: false; row: InvalidLeadRow };

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

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SIREN_PATTERN = /^\d{9}$/;
const PDL_PATTERN = /^\d{14}$/;
const SEGMENTS = new Set(["C2", "C3", "C4", "C5"]);

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const rich = (value as { richText?: Array<{ text?: string }> }).richText;
    if (Array.isArray(rich)) return rich.map((part) => part.text ?? "").join("");
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string") return text;
    if (value instanceof Date) return value.toISOString();
    return String((value as { result?: unknown }).result ?? "");
  }
  return String(value);
}

function cleanText(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = cellText(value).trim();
  if (!text) return undefined;
  return text.slice(0, max);
}

function digits(value: unknown): string | undefined {
  const text = cleanText(value, 40);
  if (!text) return undefined;
  return text.replace(/[\s.-]/g, "");
}

function asAnnualSpend(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const amount = typeof value === "number" ? value : Number(String(value).replace(/[\s€]/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return undefined;
  return Math.round(amount);
}

export function validateLeadRow(raw: RawImportRow): ParsedLeadRow {
  const fields: LeadImportField[] = [];
  const values = raw.values;

  const legalName = cleanText(values.legalName, 180);
  if (!legalName) fields.push("legalName");

  const siren = digits(values.siren);
  if (siren && !SIREN_PATTERN.test(siren)) fields.push("siren");

  const email = cleanText(values.contactEmail, 254)?.toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) fields.push("contactEmail");

  const phone = cleanText(values.contactPhone, 40);
  if (phone && phone.replace(/[\s+().-]/g, "").length < 6) fields.push("contactPhone");

  const pdl = digits(values.pdl);
  if (pdl && !PDL_PATTERN.test(pdl)) fields.push("pdl");

  const segment = cleanText(values.segment, 4)?.toUpperCase();
  if (segment && !SEGMENTS.has(segment)) fields.push("segment");

  const annualSpend = asAnnualSpend(values.annualSpend);
  if (annualSpend === undefined && values.annualSpend !== undefined && values.annualSpend !== null && String(values.annualSpend).trim() !== "") {
    fields.push("annualSpend");
  }

  if (fields.length > 0) {
    return { ok: false, row: { line: raw.line, fields } };
  }

  const baseNotes = cleanText(values.notes, 4_000);
  const spendNote = annualSpend !== undefined
    ? `Dépense énergie annuelle estimée : ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(annualSpend)} €.`
    : undefined;
  const notes = [baseNotes, spendNote].filter(Boolean).join("\n") || undefined;

  return {
    ok: true,
    row: {
      line: raw.line,
      input: {
        legalName: legalName!,
        siren,
        contactName: cleanText(values.contactName, 180),
        contactEmail: email,
        contactPhone: phone,
        pdl,
        segment: (segment || undefined) as CreateLeadInput["segment"],
        source: cleanText(values.source, 120),
        notes,
      },
      keys: { siren: siren ?? null, email: email ?? null, phone: phone ?? null },
    },
  };
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

export class LeadRowImporter {
  private readonly database: D1Database;
  private readonly leads: LeadRepository;

  constructor(database: D1Database, leads: LeadRepository) {
    this.database = database;
    this.leads = leads;
  }

  async importRows(
    actor: WorkspaceActor,
    options: { rows: RawImportRow[]; idempotencyKey: string; fileName: string | null },
  ): Promise<LeadImportResult> {
    if (!options.idempotencyKey || options.idempotencyKey.length < 8 || options.idempotencyKey.length > 120) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "idempotencyKey");
    }

    const replayed = await this.findImportRun(actor, options.idempotencyKey);
    if (replayed) return replayed;

    if (options.rows.length > LEAD_IMPORT_MAX_ROWS) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    const parsed = options.rows.map(validateLeadRow);

    const valid: ValidLeadRow[] = [];
    const results: ImportRowResult[] = [];
    for (const entry of parsed) {
      if (entry.ok) {
        valid.push(entry.row);
      } else {
        results.push({ line: entry.row.line, status: "failed", fields: entry.row.fields });
      }
    }

    const existing = await this.leads.findExistingKeys(actor, {
      sirens: valid.map((row) => row.keys.siren).filter((value): value is string => Boolean(value)),
      emails: valid.map((row) => row.keys.email).filter((value): value is string => Boolean(value)),
      phones: valid.map((row) => row.keys.phone).filter((value): value is string => Boolean(value)),
    });

    // Duplicates inside the same file count as duplicates too.
    const seen = { sirens: new Set(existing.sirens), emails: new Set(existing.emails), phones: new Set(existing.phones) };
    const toCreate: ValidLeadRow[] = [];
    for (const row of valid) {
      const duplicateFields = duplicateFieldsFor(row, seen);
      if (duplicateFields.length > 0) {
        results.push({ line: row.line, status: "skipped", reason: "duplicate", fields: duplicateFields });
        continue;
      }
      toCreate.push(row);
      if (row.keys.siren) seen.sirens.add(row.keys.siren);
      if (row.keys.email) seen.emails.add(row.keys.email);
      if (row.keys.phone) seen.phones.add(row.keys.phone);
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
      totalRows: options.rows.length,
      createdCount: toCreate.length,
      skippedCount: results.filter((row) => row.status === "skipped").length,
      failedCount: results.filter((row) => row.status === "failed").length,
      rows: results,
    };

    await this.recordImportRun(actor, options, result);
    return result;
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

function duplicateFieldsFor(
  row: ValidLeadRow,
  existing: { sirens: Set<string>; emails: Set<string>; phones: Set<string> },
): LeadImportField[] {
  const fields: LeadImportField[] = [];
  if (row.keys.siren && existing.sirens.has(row.keys.siren)) fields.push("siren");
  if (row.keys.email && existing.emails.has(row.keys.email)) fields.push("contactEmail");
  if (row.keys.phone && existing.phones.has(row.keys.phone)) fields.push("contactPhone");
  return fields;
}
