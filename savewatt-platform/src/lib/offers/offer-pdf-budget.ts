import type { OfferVersionRecord } from "./offer-types";
import { escapeHtml, renderBrandHeader, renderLegalFooter, type OfferPdfMeta } from "./offer-pdf.ts";

const CADRAN_LABELS: Record<string, string> = {
  HPH: "HP hiver",
  HCH: "HC hiver",
  HPE: "HP été",
  HCE: "HC été",
  HP: "Heures pleines",
  HC: "Heures creuses",
  BASE: "Base",
};

/**
 * Symphonics-style technical document ("budget prévisionnel"). Mirrors the
 * supplier proposal layout — forecast consumption per cadran, final price
 * lines, obligations, full budget breakdown — but only customer-safe values
 * enter the context: final margin-inclusive prices and budget line totals.
 * Buy price (électron), margin and per-MWh CEE/capacity components never
 * reach this template (secrecy by construction, specs/symphonics-pricing-model.md §4).
 */
export function renderOfferBudgetHtml(
  version: OfferVersionRecord,
  meta: OfferPdfMeta,
  locale: string,
): string {
  const budget = version.budget;
  if (!budget) throw new Error("OFFER_BUDGET_MISSING");

  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  const th = "padding:8px 12px;text-align:right;font-weight:600;";
  const thFirst = "padding:8px 12px;text-align:left;font-weight:600;";
  const td = "padding:9px 12px;border-bottom:1px solid #e6e2d8;text-align:right;";
  const tdFirst = "padding:9px 12px;border-bottom:1px solid #e6e2d8;";

  const consumptionRows = budget.energy.lines
    .map(
      (line) => `<tr>
        <td style="${tdFirst}font-family:monospace;font-weight:600;">${escapeHtml(CADRAN_LABELS[line.cadran] ?? line.cadran)}</td>
        <td style="${td}font-family:monospace;">${num.format(line.volumeMwh)} MWh</td>
      </tr>`,
    )
    .join("");

  const priceRows = budget.energy.lines
    .map(
      (line) => `<tr>
        <td style="${tdFirst}font-family:monospace;font-weight:600;">${escapeHtml(CADRAN_LABELS[line.cadran] ?? line.cadran)}</td>
        <td style="${td}font-family:monospace;">${num.format(line.rateEurMwh)} €/MWh</td>
      </tr>`,
    )
    .join("");

  const budgetRow = (label: string, amount: number, opts: { indent?: boolean; bold?: boolean } = {}) =>
    `<tr>
      <td style="${tdFirst}${opts.indent ? "padding-left:28px;color:#5b665f;" : ""}${opts.bold ? "font-weight:700;" : ""}">${label}</td>
      <td style="${td}font-family:monospace;${opts.bold ? "font-weight:700;" : ""}">${money.format(amount)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>Budget prévisionnel — ${escapeHtml(meta.clientName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1d2b25; margin: 0; font-size: 13px; line-height: 1.5; }
</style>
</head>
<body>
  ${renderBrandHeader("Budget prévisionnel — fourniture d'électricité", version, locale)}

  <section style="margin-top:20px;display:flex;justify-content:space-between;">
    <div>
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Client</p>
      <p style="margin:4px 0 0;font-weight:600;">${escapeHtml(meta.clientName)}</p>
      ${meta.pdl ? `<p style="margin:2px 0 0;color:#5b665f;">PDL ${escapeHtml(meta.pdl)}</p>` : ""}
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Durée du contrat</p>
      <p style="margin:4px 0 0;font-weight:600;">${version.supplierOffer.termYears} an(s)</p>
    </div>
  </section>

  <section style="margin-top:24px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Consommation annuelle prévisionnelle</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e2d8;">
      <thead>
        <tr style="background:#f5f1e8;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8a938c;">
          <th style="${thFirst}">Cadran</th>
          <th style="${th}">Volume prévisionnel</th>
        </tr>
      </thead>
      <tbody>${consumptionRows}
        <tr style="background:#f5f1e8;">
          <td style="padding:9px 12px;font-weight:700;">Total</td>
          <td style="padding:9px 12px;text-align:right;font-family:monospace;font-weight:700;">${num.format(budget.cee.volumeMwh)} MWh</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Prix de l'énergie — prix finals hors taxes</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e2d8;">
      <thead>
        <tr style="background:#f5f1e8;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8a938c;">
          <th style="${thFirst}">Cadran</th>
          <th style="${th}">Prix offert</th>
        </tr>
      </thead>
      <tbody>${priceRows}</tbody>
    </table>
  </section>

  <section style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Obligations et compléments</p>
    <p style="margin:0;">
      Abonnement : <strong>${num.format(version.supplierOffer.subscriptionEurMonth)} €/mois</strong>
      ${version.currentContract.subscribedPowerKva !== null ? ` · Puissance souscrite : <strong>${num.format(version.currentContract.subscribedPowerKva)} kVA</strong>` : ""}
    </p>
  </section>

  <section style="margin-top:24px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Budget prévisionnel annuel</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e2d8;">
      <tbody>
        ${budgetRow("Énergie", budget.energy.totalEur)}
        ${budgetRow("Abonnement", budget.subscription.totalEur)}
        ${budgetRow("CEE", budget.cee.totalEur)}
        ${budgetRow("Capacité (garanties de capacité)", budget.capacity.totalEur)}
        ${budgetRow("Acheminement (TURPE)", budget.acheminement.totalEur, { bold: true })}
        ${budgetRow("dont part fixe (gestion, comptage, soutirage fixe)", budget.acheminement.fixed.totalEur, { indent: true })}
        ${budgetRow("dont part variable (soutirage par cadran)", budget.acheminement.variable.totalEur, { indent: true })}
        ${budgetRow("Accise sur l'électricité", budget.accise.totalEur)}
        ${budgetRow("Contribution tarifaire d'acheminement (CTA)", budget.cta.totalEur)}
        <tr style="background:#f5f1e8;">
          <td style="padding:9px 12px;font-weight:700;">Total hors taxes</td>
          <td style="padding:9px 12px;text-align:right;font-family:monospace;font-weight:700;">${money.format(budget.totalHtEur)}</td>
        </tr>
        ${budgetRow(`TVA (${num.format(budget.tva.rate * 100)} %)`, budget.tva.totalEur)}
        <tr style="background:#118a34;">
          <td style="padding:10px 12px;font-weight:700;color:#ffffff;">Total TTC annuel</td>
          <td style="padding:10px 12px;text-align:right;font-family:monospace;font-weight:700;color:#ffffff;">${money.format(budget.totalTtcEur)}</td>
        </tr>
      </tbody>
    </table>
    <p style="margin:8px 0 0;color:#5b665f;font-size:11px;">
      Soit ${money.format(budget.termTotalTtcEur)} TTC sur la durée totale du contrat (${budget.termYears} an(s)), à consommation constante.
    </p>
  </section>

  <p style="margin-top:20px;font-size:10px;color:#8a938c;line-height:1.6;">
    Budget prévisionnel établi sur la base de la consommation annuelle prévisionnelle ci-dessus et des tarifs
    réglementés en vigueur (TURPE, accise, CTA, TVA). Toute évolution des tarifs réglementés est répercutée
    à l'euro l'euro. Les montants sont indicatifs et ne constituent pas un engagement contractuel de résultat.
    Nous ne vendons pas d'énergie : SaveWatt vous accompagne dans le choix de votre contrat.
  </p>

  ${renderLegalFooter(version, locale)}
</body>
</html>`;
}
