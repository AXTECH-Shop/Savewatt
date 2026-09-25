import ExcelJS from "exceljs";
import { cellText, type LeadImportField, type RawImportRow } from "./lead-import-rows.ts";

export {
  LEAD_IMPORT_MAX_ROWS,
  validateLeadRow,
  type InvalidLeadRow,
  type LeadImportField,
  type ParsedLeadRow,
  type RawImportRow,
  type ValidLeadRow,
} from "./lead-import-rows.ts";

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

function normalizeHeader(value: unknown): string {
  return cellText(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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
