import type { OfferVersionRecord } from "./offer-types";
import { escapeHtml, renderBrandHeader, renderLegalFooter, type OfferPdfMeta } from "./offer-pdf.ts";

/**
 * Marketing one-pager: hero savings, benefits, simplified current-vs-proposed
 * comparison, TTC budget summary, CTA. Customer-safe by construction — final
 * prices and totals only; électron, margin and component rates never enter
 * the context.
 */
export function renderOfferMarketingHtml(
  version: OfferVersionRecord,
  meta: OfferPdfMeta,
  locale: string,
): string {
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const serif = "Fraunces, Georgia, 'Times New Roman', serif";
  const comparison = version.comparison;
  const budget = version.budget;
  const termMonths = version.supplierOffer.termYears * 12;

  const benefits: [string, string][] = [
    [`Prix fixe ${termMonths} mois`, "Votre prix de l'énergie est verrouillé pour toute la durée du contrat."],
    ["100 % renouvelable", "Électricité certifiée par des Garanties d'Origine européennes."],
    ["Accompagnement SaveWatt", "Un bureau d'études indépendant suit votre contrat de bout en bout."],
    ["Zéro démarche", "Nous gérons la résiliation et la bascule — aucune coupure, aucune paperasse."],
  ];

  const benefitBlocks = benefits
    .map(
      ([title, text]) => `<div style="flex:1 1 40%;background:#f5f1e8;border-radius:10px;padding:14px 16px;">
        <p style="margin:0;font-weight:700;color:#118a34;">${title}</p>
        <p style="margin:4px 0 0;color:#5b665f;font-size:12px;">${text}</p>
      </div>`,
    )
    .join("");

  const bestGain = comparison.rows
    .filter((row) => row.gainPerYear !== null && row.gainPerYear > 0)
    .sort((a, b) => (b.gainPerYear ?? 0) - (a.gainPerYear ?? 0))[0];

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>Votre offre SaveWatt — ${escapeHtml(meta.clientName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1d2b25; margin: 0; font-size: 13px; line-height: 1.5; }
</style>
</head>
<body>
  ${renderBrandHeader("Votre offre d'énergie", version, locale)}

  <section style="margin-top:24px;background:#f5f1e8;border-radius:14px;padding:24px 28px;">
    <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#0d6a2b;">Votre économie estimée</p>
    <p style="margin:10px 0 0;font-family:${serif};font-size:40px;font-weight:700;color:#118a34;line-height:1.1;">
      ${money.format(comparison.annualSaving)} <span style="font-size:18px;font-weight:500;color:#0d6a2b;">/ an</span>
    </p>
    <p style="margin:8px 0 0;font-size:15px;color:#1d2b25;">
      soit <strong>${money.format(comparison.termSaving)}</strong> sur ${comparison.termYears} an(s), à périmètre identique.
    </p>
    <p style="margin:6px 0 0;font-size:12px;color:#5b665f;">
      ${escapeHtml(meta.clientName)}${meta.pdl ? ` · PDL ${escapeHtml(meta.pdl)}` : ""}
    </p>
  </section>

  <section style="margin-top:22px;">
    <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Ce que vous y gagnez</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">${benefitBlocks}</div>
  </section>

  <section style="margin-top:22px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8a938c;">Votre situation, en résumé</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e2d8;">
      <tbody>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e2d8;color:#5b665f;">Aujourd'hui</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e2d8;text-align:right;">
            <strong>${escapeHtml(version.currentContract.supplier || "—")}</strong>${version.currentContract.offerName ? ` · ${escapeHtml(version.currentContract.offerName)}` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e2d8;color:#5b665f;">Avec SaveWatt</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e2d8;text-align:right;color:#118a34;">
            <strong>${escapeHtml(version.supplierOffer.supplier)}</strong> · prix fixe ${termMonths} mois · 100 % renouvelable
          </td>
        </tr>
        ${
          bestGain
            ? `<tr>
          <td style="padding:10px 12px;color:#5b665f;">Meilleur gain par cadran</td>
          <td style="padding:10px 12px;text-align:right;font-family:monospace;">${escapeHtml(bestGain.cadran)} : <strong>${money.format(bestGain.gainPerYear ?? 0)} / an</strong></td>
        </tr>`
            : ""
        }
      </tbody>
    </table>
  </section>

  ${
    budget
      ? `<section style="margin-top:22px;border:1px solid #bfe6cc;background:#eaf7ee;border-radius:10px;padding:16px 20px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:#0d6a2b;">Votre budget énergie prévisionnel</p>
    <p style="margin:6px 0 0;font-size:15px;">
      <strong>${money.format(budget.totalTtcEur)} TTC / an</strong>
      <span style="color:#5b665f;"> · toutes taxes et acheminement inclus</span>
    </p>
    <p style="margin:4px 0 0;font-size:12px;color:#5b665f;">Le détail ligne par ligne figure dans le budget prévisionnel joint.</p>
  </section>`
      : ""
  }

  <section style="margin-top:26px;text-align:center;">
    <p style="margin:0;font-family:${serif};font-size:20px;font-weight:700;">Prêt à réduire votre facture ?</p>
    <p style="margin:8px 0 0;color:#5b665f;">
      Répondez à l'email reçu ou écrivez à <strong style="color:#118a34;">contact@savewatt.fr</strong> —
      offre valable jusqu'au <strong>${
        version.supplierOffer.validUntil
          ? new Date(version.supplierOffer.validUntil).toLocaleDateString(locale)
          : "—"
      }</strong>.
    </p>
  </section>

  <p style="margin-top:20px;font-size:10px;color:#8a938c;line-height:1.6;">
    Estimation établie à périmètre identique à partir de votre consommation déclarée. Les économies présentées
    sont indicatives et ne constituent pas un engagement contractuel de résultat. Nous ne vendons pas d'énergie :
    SaveWatt vous accompagne dans le choix de votre contrat.
  </p>

  ${renderLegalFooter(version, locale)}
</body>
</html>`;
}
