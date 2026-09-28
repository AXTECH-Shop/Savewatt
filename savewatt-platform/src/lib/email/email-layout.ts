import { BRAND, BRAND_ASSETS, BRAND_COLORS as C, LEGAL_LINE_FR, ROLE_STATEMENT_FR } from "../brand.ts";

/**
 * Co-branded transactional email shell: Zack AI wordmark, Symphonics as the
 * energy supplier, and the fixed role statement in the footer. Table layout
 * and inline styles only, so Gmail and Outlook render it the same way.
 */
export function renderBrandedEmail(content: string): string {
  return `<div style="margin:0;padding:24px 12px;background:${C.surface};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${C.line};border-radius:12px;border-collapse:separate;font-family:Arial,Helvetica,sans-serif;color:${C.ink};line-height:1.6;">
    <tr>
      <td style="padding:20px 24px 16px;border-bottom:3px solid ${C.navy};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;">
              <img src="${BRAND_ASSETS.logo}" width="130" height="24" alt="${BRAND.name}" style="display:block;border:0;" />
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <span style="display:block;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${C.faint};">Fournisseur d'énergie</span>
              <img src="${BRAND_ASSETS.symphonicsLogo}" width="96" height="33" alt="Symphonics" style="display:inline-block;border:0;margin-top:2px;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;font-size:14px;">${content}</td>
    </tr>
    <tr>
      <td style="padding:16px 24px;background:${C.navySoft};border-radius:0 0 12px 12px;font-size:12px;color:${C.muted};">
        <p style="margin:0 0 6px;color:${C.navyDeep};">${ROLE_STATEMENT_FR}</p>
        <p style="margin:0;font-size:11px;color:${C.faint};">${LEGAL_LINE_FR} ·
          <a href="mailto:${BRAND.contactEmail}" style="color:${C.navy};">${BRAND.contactEmail}</a> ·
          <a href="${BRAND.site}" style="color:${C.navy};">${BRAND.siteLabel}</a></p>
      </td>
    </tr>
  </table>
</div>`;
}

/** Plain-text counterpart: body paragraphs, then the role statement and legal line. */
export function renderBrandedEmailText(paragraphs: string[]): string {
  return [...paragraphs, "—", ROLE_STATEMENT_FR, `${LEGAL_LINE_FR} · ${BRAND.contactEmail} · ${BRAND.siteLabel}`].join(
    "\n\n",
  );
}
