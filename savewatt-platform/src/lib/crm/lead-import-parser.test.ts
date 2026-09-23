import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import {
  LEAD_IMPORT_MAX_ROWS,
  parseLeadWorkbook,
  validateLeadRow,
} from "./lead-import-parser.ts";

async function buildWorkbook(rows: Array<Record<string, unknown>>): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Prospects");
  sheet.addRow([
    "Société*",
    "SIREN",
    "Contact",
    "Email",
    "Téléphone",
    "PDL (14 chiffres)",
    "Segment (C2/C3/C4/C5)",
    "Source",
    "Dépense énergie annuelle estimée (€)",
    "Notes",
  ]);
  for (const row of rows) {
    sheet.addRow([
      row.legalName,
      row.siren,
      row.contactName,
      row.contactEmail,
      row.contactPhone,
      row.pdl,
      row.segment,
      row.source,
      row.annualSpend,
      row.notes,
    ]);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer.slice(0);
}

describe("lead import parser", () => {
  it("parses and validates the template columns", async () => {
    const buffer = await buildWorkbook([
      {
        legalName: "Boulangerie Dupont",
        siren: "123 456 789",
        contactName: "Marie Dupont",
        contactEmail: "Marie@Example.FR",
        contactPhone: "06 12 34 56 78",
        pdl: "1234 5678 9012 34",
        segment: "c2",
        source: "Salon",
        annualSpend: "45 000",
        notes: "Devis avant septembre",
      },
    ]);
    const rows = await parseLeadWorkbook(buffer);
    assert.equal(rows.length, 1);
    const parsed = validateLeadRow(rows[0]);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.row.input.legalName, "Boulangerie Dupont");
    assert.equal(parsed.row.input.siren, "123456789");
    assert.equal(parsed.row.input.contactEmail, "marie@example.fr");
    assert.equal(parsed.row.input.pdl, "12345678901234");
    assert.equal(parsed.row.input.segment, "C2");
    assert.match(parsed.row.input.notes ?? "", /45.?000/);
    assert.deepEqual(parsed.row.keys, { siren: "123456789", email: "marie@example.fr", phone: "06 12 34 56 78" });
  });

  it("rejects rows with invalid fields", async () => {
    const buffer = await buildWorkbook([
      { legalName: "", siren: "abc", contactEmail: "not-an-email", pdl: "123", segment: "C9", annualSpend: "beaucoup" },
    ]);
    const rows = await parseLeadWorkbook(buffer);
    const parsed = validateLeadRow(rows[0]);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.deepEqual(parsed.row.fields, ["legalName", "siren", "contactEmail", "pdl", "segment", "annualSpend"]);
  });

  it("accepts a minimal row with only a company name", async () => {
    const parsed = validateLeadRow({ line: 2, values: { legalName: "Garage Martin" } });
    assert.equal(parsed.ok, true);
  });

  it("flags a workbook without a company column", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Prospects");
    sheet.addRow(["Random", "Columns"]);
    sheet.addRow(["a", "b"]);
    const buffer = await workbook.xlsx.writeBuffer();
    await assert.rejects(() => parseLeadWorkbook(buffer.slice(0)), /MISSING_LEGAL_NAME_COLUMN/);
  });

  it("enforces the row limit constant", () => {
    assert.equal(LEAD_IMPORT_MAX_ROWS, 500);
  });
});
