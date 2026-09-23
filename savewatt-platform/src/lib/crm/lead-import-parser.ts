import ExcelJS from "exceljs";
import type { CreateLeadInput } from "./crm-types";

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

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SIREN_PATTERN = /^\d{9}$/;
const PDL_PATTERN = /^\d{14}$/;
const SEGMENTS = new Set(["C2", "C3", "C4", "C5"]);

const HEADER_ALIASES: Record<string, LeadImportField> = {
  société: "legalName",
  societe: "legalName",
  "société*": "legalName",
  "societe*": "legalName",
  siren: "siren",
  contact: "contactName" as LeadImportField,
  email: "contactEmail",
  téléphone: "contactPhone",
  telephone: "contactPhone",
  tel: "contactPhone",
  "pdl (14 chiffres)": "pdl",
  pdl: "pdl",
  "segment (c2/c3/c4/c5)": "segment",
  segment: "segment",
  source: "source" as LeadImportField,
  "dépense énergie annuelle estimée (€)": "annualSpend",
  "depense energie annuelle estimee (€)": "annualSpend",
  "dépense énergie annuelle estimée (eur)": "annualSpend",
  notes: "notes",
};

function cellText(value: unknown): string {
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

function normalizeHeader(value: unknown): string {
  return cellText(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

export async function parseLeadWorkbook(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer.slice(0));
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const columnMap = new Map<number, LeadImportField>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const field = HEADER_ALIASES[normalizeHeader(cell.value)];
    if (field) columnMap.set(colNumber, field);
  });
  if (![...columnMap.values()].includes("legalName")) {
    throw new Error("MISSING_LEGAL_NAME_COLUMN");
  }

  const rows: RawImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Record<string, unknown> = {};
    columnMap.forEach((field, colNumber) => {
      values[field] = row.getCell(colNumber).value;
    });
    rows.push({ line: rowNumber, values });
  });
  return rows;
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
