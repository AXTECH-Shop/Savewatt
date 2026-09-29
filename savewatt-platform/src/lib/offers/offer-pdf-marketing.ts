import type { OfferVersionRecord } from "./offer-types";
import { BRAND, BRAND_COLORS as C } from "../brand.ts";
import { escapeHtml, renderBrandHeader, renderLegalFooter, renderRoleNotice, type OfferPdfMeta } from "./offer-pdf.ts";

/**
 * Marketing one-pager: hero savings, benefits, simplified current-vs-proposed
 * comparison, TTC budget summary, CTA. Customer-safe by construction — final
 * prices and totals only; électron, margin and component rates never enter
 * the context. Laid out as a fixed 210×297 mm sheet so it always prints on
 * exactly one A4 page.
 */
export function renderOfferMarketingHtml(
  version: OfferVersionRecord,
  meta: OfferPdfMeta,
  locale: string,
): string {
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  // Chrome's PDF output drops U+202F (French thousands separator); use a regular no-break space.
  const money = { format: (value: number) => currency.format(value).replace(/\u202f/g, "\u00a0") };
  const comparison = version.comparison;
  const budget = version.budget;
  const termMonths = version.supplierOffer.termYears * 12;
  const hasSaving = comparison.annualSaving > 0;
  const validUntil = version.supplierOffer.validUntil
    ? new Date(version.supplierOffer.validUntil).toLocaleDateString(locale)
    : "—";

  const benefits: [string, string][] = [
    [`Prix fixe ${termMonths} mois`, "Votre prix de l'énergie est verrouillé pour toute la durée du contrat."],
    ["100 % renouvelable", "Électricité certifiée par des Garanties d'Origine européennes."],
    ["Suivi Zack AI", "Zack AI suit votre consommation et vous aide à optimiser votre énergie pendant tout le contrat."],
    ["Zéro démarche", "Nous gérons la résiliation et la bascule — aucune coupure, aucune paperasse."],
  ];

  const benefitCells = benefits
    .map(
      ([title, text], index) => `<div class="benefit">
        <span class="benefit-index">0${index + 1}</span>
        <div><p class="benefit-title">${title}</p><p class="benefit-text">${text}</p></div>
      </div>`,
    )
    .join("");

  const bestGain = comparison.rows
    .filter((row) => row.gainPerYear !== null && row.gainPerYear > 0)
    .sort((a, b) => (b.gainPerYear ?? 0) - (a.gainPerYear ?? 0))[0];

  const hero = hasSaving
    ? `<p class="eyebrow">Votre économie estimée</p>
      <p class="hero-figure">${money.format(comparison.annualSaving)}<span class="hero-unit">/ an</span></p>
      <p class="hero-sub">soit <strong>${money.format(comparison.termSaving)}</strong> sur ${comparison.termYears} an(s), à périmètre identique.</p>`
    : `<p class="eyebrow">Votre offre d'énergie</p>
      <p class="hero-figure hero-figure-neutral">Prix fixe ${termMonths} mois</p>
      <p class="hero-sub">Un prix de l'énergie garanti sur ${comparison.termYears} an(s), à périmètre identique.</p>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>Votre offre Zack AI — ${escapeHtml(meta.clientName)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: ${C.ink}; font-size: 12px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; font-variant-numeric: tabular-nums; }
  p { margin: 0; }
  .sheet { width: 210mm; height: 297mm; padding: 13mm 14mm 10mm; display: flex; flex-direction: column; overflow: hidden; }
  .eyebrow { font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${C.faint}; }
  .section { margin-top: 22px; }
  .section > .eyebrow { margin-bottom: 8px; }

  .hero { margin-top: 20px; display: flex; align-items: stretch; border-radius: 12px; overflow: hidden; background: ${C.navyDeep}; color: #fff; }
  .hero-main { flex: 1 1 auto; padding: 24px 26px; }
  .hero-main .eyebrow { color: #b9c1e2; }
  .hero-figure { margin-top: 6px; font-size: 44px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; color: #ff6fb0; }
  .hero-figure-neutral { font-size: 32px; color: #fff; }
  .hero-unit { margin-left: 8px; font-size: 16px; font-weight: 500; letter-spacing: 0; color: #dfe3f3; }
  .hero-sub { margin-top: 10px; font-size: 13px; color: #dfe3f3; }
  .hero-sub strong { color: #fff; }
  .hero-side { flex: 0 0 62mm; padding: 20px 20px; background: ${C.navy}; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
  .hero-side .eyebrow { color: #b9c1e2; }
  .hero-side p.value { margin-top: 2px; font-size: 13px; font-weight: 600; color: #fff; word-break: break-word; }

  .benefits { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .benefit { display: flex; gap: 10px; padding: 13px 14px; border: 1px solid ${C.line}; border-radius: 10px; }
  .benefit-index { flex: 0 0 auto; font-size: 10px; font-weight: 700; color: ${C.pink}; padding-top: 1px; }
  .benefit-title { font-size: 12.5px; font-weight: 700; color: ${C.navy}; }
  .benefit-text { margin-top: 2px; font-size: 10.5px; color: ${C.muted}; line-height: 1.4; }

  .compare { display: grid; grid-template-columns: 1fr 22px 1fr; align-items: stretch; }
  .compare-card { padding: 12px 14px; border-radius: 10px; }
  .compare-card.now { border: 1px solid ${C.line}; }
  .compare-card.next { border: 1px solid ${C.navyLine}; background: ${C.navySoft}; }
  .compare-card .label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${C.faint}; }
  .compare-card.next .label { color: ${C.navy}; }
  .compare-card .name { margin-top: 4px; font-size: 14px; font-weight: 700; }
  .compare-card.next .name { color: ${C.navyDeep}; }
  .compare-card .detail { margin-top: 2px; font-size: 10.5px; color: ${C.muted}; }
  .compare-arrow { display: flex; align-items: center; justify-content: center; color: ${C.pink}; font-size: 16px; font-weight: 700; }
  .best-gain { margin-top: 8px; font-size: 11px; color: ${C.muted}; }
  .best-gain strong { color: ${C.navyDeep}; }

  .budget { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 16px; border-left: 3px solid ${C.navy}; background: ${C.surface}; border-radius: 0 10px 10px 0; }
  .budget-total { font-size: 18px; font-weight: 700; color: ${C.navyDeep}; white-space: nowrap; }
  .budget-note { font-size: 10.5px; color: ${C.muted}; }

  .cta { margin-top: 24px; display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 14px 18px; border-radius: 10px; border: 1.5px solid ${C.pink}; }
  .cta-title { font-size: 16px; font-weight: 700; color: ${C.navyDeep}; }
  .cta-text { margin-top: 2px; font-size: 11px; color: ${C.muted}; }
  .cta-mail { font-size: 13px; font-weight: 700; color: ${C.navy}; white-space: nowrap; text-align: right; }
  .cta-mail span { display: block; font-size: 10px; font-weight: 500; color: ${C.muted}; }

  .disclaimer { margin-top: 12px; font-size: 9px; color: ${C.faint}; line-height: 1.5; }
  .bottom { margin-top: auto; }
  .bottom > p:first-child { margin-top: 10px !important; }
  .bottom footer { margin-top: 12px !important; }
</style>
</head>
<body>
<div class="sheet">
  ${renderBrandHeader("Votre offre d'énergie", version, locale)}

  <section class="hero">
    <div class="hero-main">${hero}</div>
    <div class="hero-side">
      <div><p class="eyebrow">Préparée pour</p><p class="value">${escapeHtml(meta.clientName)}</p></div>
      ${meta.pdl ? `<div><p class="eyebrow">Point de livraison</p><p class="value">PDL ${escapeHtml(meta.pdl)}</p></div>` : ""}
      <div><p class="eyebrow">Durée</p><p class="value">${termMonths} mois · prix fixe</p></div>
    </div>
  </section>

  <section class="section">
    <p class="eyebrow">Ce que vous y gagnez</p>
    <div class="benefits">${benefitCells}</div>
  </section>

  <section class="section">
    <p class="eyebrow">Votre situation, en résumé</p>
    <div class="compare">
      <div class="compare-card now">
        <p class="label">Aujourd'hui</p>
        <p class="name">${escapeHtml(version.currentContract.supplier || "—")}</p>
        <p class="detail">${version.currentContract.offerName ? escapeHtml(version.currentContract.offerName) : "Contrat actuel"}</p>
      </div>
      <div class="compare-arrow">→</div>
      <div class="compare-card next">
        <p class="label">Votre nouvelle offre</p>
        <p class="name">${escapeHtml(version.supplierOffer.supplier)}</p>
        <p class="detail">Prix fixe ${termMonths} mois · 100 % renouvelable · suivi Zack AI</p>
      </div>
    </div>
    ${
      bestGain
        ? `<p class="best-gain">Meilleur gain par cadran : <strong>${escapeHtml(bestGain.cadran)} · ${money.format(bestGain.gainPerYear ?? 0)} / an</strong></p>`
        : ""
    }
  </section>

  ${
    budget
      ? `<section class="section">
    <p class="eyebrow">Votre budget énergie prévisionnel</p>
    <div class="budget">
      <p class="budget-note">Toutes taxes et acheminement inclus.<br />Le détail ligne par ligne figure dans le budget prévisionnel joint.</p>
      <p class="budget-total">${money.format(budget.totalTtcEur)} TTC / an</p>
    </div>
  </section>`
      : ""
  }

  <section class="cta">
    <div>
      <p class="cta-title">Prêt à réduire votre facture ?</p>
      <p class="cta-text">Répondez à l'email reçu ou écrivez-nous — offre valable jusqu'au <strong>${validUntil}</strong>.</p>
    </div>
    <p class="cta-mail">${BRAND.contactEmail}<span>${BRAND.siteLabel}</span></p>
  </section>

  <p class="disclaimer">
    Estimation établie à périmètre identique à partir de votre consommation déclarée. Les économies présentées
    sont indicatives et ne constituent pas un engagement contractuel de résultat.
  </p>

  <div class="bottom">
    ${renderRoleNotice()}
    ${renderLegalFooter(version, locale)}
  </div>
</div>
</body>
</html>`;
}
