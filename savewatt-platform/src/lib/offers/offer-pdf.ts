import type { OfferVersionRecord } from "./offer-types";

export interface OfferPdfMeta {
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  pdl: string | null;
}

/** Shared SaveWatt brand header for all customer-facing offer documents. */
export function renderBrandHeader(
  subtitle: string,
  version: OfferVersionRecord,
  locale: string,
): string {
  const date = version.supplierOffer.validUntil
    ? new Date(version.supplierOffer.validUntil).toLocaleDateString(locale)
    : "—";
  return `<header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #118a34;padding-bottom:16px;">
    <div>
      <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Save<span style="color:#118a34;">Watt</span></p>
      <p style="margin:4px 0 0;color:#5b665f;font-size:12px;">Bureau d'études en optimisation énergétique</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#5b665f;">
      <p style="margin:0;font-weight:600;color:#1d2b25;">${escapeHtml(subtitle)}</p>
      <p style="margin:2px 0 0;">Valable jusqu'au ${date}</p>
      <p style="margin:2px 0 0;">Version v${version.versionNo}</p>
    </div>
  </header>`;
}

/** Shared legal footer for all customer-facing offer documents. */
export function renderLegalFooter(version: OfferVersionRecord, locale: string): string {
  return `<footer style="margin-top:24px;border-top:1px solid #e6e2d8;padding-top:10px;font-size:9px;color:#8a938c;line-height:1.5;">
    <strong>AX TECH — ECOLED WAVE CONCEPT</strong> · SAS · SIREN 751 982 760 · SIRET 751 982 760 00041 · TVA FR86 751 982 760<br />
    8 rue Marbeau, 75016 Paris · contact@savewatt.fr<br />
    Document généré le ${new Date().toLocaleString(locale)} · empreinte ${version.sha256.slice(0, 16)}…
  </footer>`;
}

export { renderOfferBudgetHtml } from "./offer-pdf-budget.ts";
export { renderOfferMarketingHtml } from "./offer-pdf-marketing.ts";

/**
 * Customer-safe offer HTML. Only client-visible values enter the template
 * context: final prices (already margin-inclusive), current supplier/offer,
 * savings. Buy price (electron), CEE/capacity components, margin and internal
 * notes never reach this function — secrecy by construction, not by filtering.
 */
export function renderOfferHtml(
  version: OfferVersionRecord,
  meta: OfferPdfMeta,
  locale: string,
): string {
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const date = version.supplierOffer.validUntil
    ? new Date(version.supplierOffer.validUntil).toLocaleDateString(locale)
    : "—";
  const rows = version.clientPriceLines
    .map(
      (line) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e6e2d8;font-family:monospace;font-weight:600;">${line.cadran}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e6e2d8;text-align:right;">${num.format(line.priceEurMwh)} €/MWh</td>
      </tr>`,
    )
    .join("");
  const comparisonRows = version.comparison.rows
    .map((row) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e6e2d8;font-family:monospace;">${row.cadran}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e6e2d8;text-align:right;color:#5b665f;">${
        row.currentEurMwh !== null ? `${num.format(row.currentEurMwh)} €/MWh` : "—"
      }</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e6e2d8;text-align:right;color:#118a34;">${
        row.gainPerYear !== null ? money.format(row.gainPerYear) : "—"
      }</td>
    </tr>`)
    .join("");

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>Offre SaveWatt — ${escapeHtml(meta.clientName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1d2b25; margin: 0; font-size: 13px; line-height: 1.5; }
</style>
</head>
<body>
  <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #118a34;padding-bottom:16px;">
    <div>
      <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Save<span style="color:#118a34;">Watt</span></p>
      <p style="margin:4px 0 0;color:#5b665f;font-size:12px;">Bureau d'études en optimisation énergétique</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#5b665f;">
      <p style="margin:0;font-weight:600;color:#1d2b25;">Offre commerciale</p>
      <p style="margin:2px 0 0;">Valable jusqu'au ${date}</p>
      <p style="margin:2px 0 0;">Version v${version.versionNo}</p>
    </div>
  </header>

  <section style="margin-top:20px;display:flex;justify-content:space-between;">
    <div>
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Pour</p>
      <p style="margin:4px 0 0;font-weight:600;">${escapeHtml(meta.clientName)}</p>
      ${meta.contactName ? `<p style="margin:2px 0 0;color:#5b665f;">${escapeHtml(meta.contactName)}</p>` : ""}
      ${meta.contactEmail ? `<p style="margin:2px 0 0;color:#5b665f;">${escapeHtml(meta.contactEmail)}</p>` : ""}
      ${meta.pdl ? `<p style="margin:2px 0 0;color:#5b665f;">PDL ${escapeHtml(meta.pdl)}</p>` : ""}
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Préparé par</p>
      <p style="margin:4px 0 0;font-weight:600;">SaveWatt</p>
    </div>
  </section>

  <section style="margin-top:24px;background:#eaf7ee;border:1px solid #bfe6cc;border-radius:10px;padding:16px 20px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:#0d6a2b;">Votre économie estimée</p>
    <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#0d6a2b;">${money.format(version.comparison.annualSaving)} <span style="font-size:14px;font-weight:500;">/ an</span>
      <span style="font-size:16px;font-weight:600;color:#12813a;margin-left:16px;">${money.format(version.comparison.termSaving)}</span>
      <span style="font-size:13px;font-weight:500;color:#0d6a2b;"> sur ${version.comparison.termYears} an(s)</span></p>
  </section>

  <section style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Situation actuelle</p>
    <p style="margin:0;">Fournisseur : <strong>${escapeHtml(version.currentContract.supplier || "—")}</strong>
      ${version.currentContract.offerName ? ` · Offre : <strong>${escapeHtml(version.currentContract.offerName)}</strong>` : ""}
      · Abonnement : <strong>${num.format(version.currentContract.subscriptionEurMonth)} €/mois</strong></p>
  </section>

  <section style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Notre offre — prix finals TTC de l'énergie</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e2d8;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f5f1e8;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8a938c;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;">Cadran</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Prix offert</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:8px 0 0;color:#5b665f;">Abonnement : <strong>${num.format(version.supplierOffer.subscriptionEurMonth)} €/mois</strong> · Durée : <strong>${version.supplierOffer.termYears} an(s)</strong></p>
  </section>

  <section style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Comparaison à périmètre identique</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e2d8;">
      <thead>
        <tr style="background:#f5f1e8;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8a938c;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;">Cadran</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Prix actuel</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Gain / an</th>
        </tr>
      </thead>
      <tbody>${comparisonRows}</tbody>
    </table>
  </section>

  <p style="margin-top:20px;font-size:10px;color:#8a938c;line-height:1.6;">
    Estimation établie à périmètre identique à partir de votre consommation déclarée. Les économies présentées sont
    indicatives et ne constituent pas un engagement contractuel de résultat. Nous ne vendons pas d'énergie :
    SaveWatt vous accompagne dans le choix de votre contrat.
  </p>

  <footer style="margin-top:24px;border-top:1px solid #e6e2d8;padding-top:10px;font-size:9px;color:#8a938c;line-height:1.5;">
    <strong>AX TECH — ECOLED WAVE CONCEPT</strong> · SAS · SIREN 751 982 760 · SIRET 751 982 760 00041 · TVA FR86 751 982 760<br />
    8 rue Marbeau, 75016 Paris · contact@savewatt.fr<br />
    Document généré le ${new Date().toLocaleString(locale)} · empreinte ${version.sha256.slice(0, 16)}…
  </footer>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
