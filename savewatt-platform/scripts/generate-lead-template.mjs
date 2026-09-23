import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/templates/modele-import-prospects.xlsx",
);

const HEADERS = [
  { header: "Société*", key: "legalName", width: 32 },
  { header: "SIREN", key: "siren", width: 14 },
  { header: "Contact", key: "contactName", width: 20 },
  { header: "Email", key: "contactEmail", width: 28 },
  { header: "Téléphone", key: "contactPhone", width: 18 },
  { header: "PDL (14 chiffres)", key: "pdl", width: 18 },
  { header: "Segment (C2/C3/C4/C5)", key: "segment", width: 20 },
  { header: "Source", key: "source", width: 18 },
  { header: "Dépense énergie annuelle estimée (€)", key: "annualSpend", width: 34 },
  { header: "Notes", key: "notes", width: 40 },
];

const EXAMPLE_ROW = {
  legalName: "Boulangerie Dupont",
  siren: "123456789",
  contactName: "Marie Dupont",
  contactEmail: "marie.dupont@example.fr",
  contactPhone: "06 12 34 56 78",
  pdl: "12345678901234",
  segment: "C2",
  source: "Salon Batimat",
  annualSpend: 45000,
  notes: "Intéressée par un devis avant septembre.",
};

const NOTES = [
  ["Mode d'emploi — import de prospects SaveWatt"],
  [""],
  ["1. Ne modifiez pas la ligne d'en-tête (ligne 1)."],
  ["2. Un seul prospect par ligne. La colonne Société est obligatoire."],
  ["3. SIREN : 9 chiffres. PDL : 14 chiffres (point de livraison Électricité)."],
  ["4. Email et téléphone servent à détecter les doublons avant création."],
  ["5. Segment : C2, C3, C4 ou C5 (professionnel), laissez vide si inconnu."],
  ["6. Chaque ligne valide crée un PROSPECT (lead) attribué à votre organisation."],
  ["7. Les doublons (même SIREN, email ou téléphone) sont ignorés avec un rapport ligne par ligne."],
  ["8. Limite : 500 lignes par import."],
];

const workbook = new ExcelJS.Workbook();
workbook.creator = "SaveWatt";
workbook.created = new Date();

const sheet = workbook.addWorksheet("Prospects");
sheet.columns = HEADERS;
sheet.getRow(1).font = { bold: true };
sheet.getRow(1).height = 24;
sheet.addRow(EXAMPLE_ROW);
sheet.getCell("J2").alignment = { wrapText: true };

const notes = workbook.addWorksheet("Mode d'emploi");
notes.getColumn(1).width = 90;
NOTES.forEach(([line], index) => {
  const row = notes.getRow(index + 1);
  row.getCell(1).value = line;
  if (index === 0) row.getCell(1).font = { bold: true, size: 14 };
});

await mkdir(dirname(outputPath), { recursive: true });
const buffer = await workbook.xlsx.writeBuffer();
await writeFile(outputPath, Buffer.from(buffer));
console.log(`Template written: ${outputPath} (${buffer.byteLength} bytes)`);
