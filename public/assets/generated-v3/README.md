# SaveWatt Production Assets v3

Approved production family generated on June 6, 2026.

## Visual Direction

- Colored isometric enterprise explainers
- Warm-white seamless canvas
- Forest green and navy structure
- Pale mint, sky blue and limestone supporting colors
- Amber and coral only for detected errors
- Current green for audit paths, recovery arrows and verified outcomes
- French labels embedded in explanatory images

Light sections display the warm-white assets directly. Dark sections display
the same files inside a warm-white technical plate with a subtle green keyline.
Do not invert or recolor the images.

## Production Masters

| ID | File | Dimensions | Placement |
|---|---|---:|---|
| A01 | `A01-favicon-master.png` | 1024x1024 | Site identity |
| A05 | `A05-og-default-fr.png` | 1200x630 | Open Graph |
| A06 | `A06-hero-audit-desktop-fr.png` | 1600x1200 | Hero desktop |
| A06 | `A06-hero-audit-mobile-fr.png` | 1080x1350 | Hero mobile |
| A07 | `A07-billing-anomaly-atlas-fr.png` | 1200x1200 | Le constat |
| A08a-f | `A08*-service-*.png` | 512x512 each | Service cards |
| A09 | `A09-process-flow-desktop-fr.png` | 1800x900 | Method desktop |
| A09 | `A09-process-flow-mobile-fr.png` | 1080x1440 | Method mobile |
| A10a-c | `A10*-sector-*.png` | 512x512 each | Sector cards |
| A11 | `A11-recovery-ledger.png` | 1000x1200 | Pourquoi SaveWatt |
| A12 | `A12-results-verification.png` | 512x512 | Results |
| A14 | `A14-final-cta-desktop.png` | 1800x360 | Final CTA desktop |
| A14 | `A14-final-cta-mobile.png` | 1080x720 | Final CTA mobile |
| A15 | `A15-contact-upload-desktop.png` | 1200x1000 | Form desktop |
| A15 | `A15-contact-upload-mobile.png` | 1080x1080 | Form mobile |

## Derived Files

- Favicon sizes: 16, 32 and 48px
- Apple touch icon: 180px
- App icon: 512px
- Social avatar: 1024px
- A07 mobile: 1080x1080
- A11 mobile: 900x1080
- AVIF and WebP versions accompany production PNG files

## Integration Rules

- Use `<picture>` with AVIF, WebP and PNG fallback for large explainers.
- Never use `object-fit: cover` on A06, A07, A09, A11 or A15.
- A06 should receive at least 54% of the desktop hero width.
- Service and sector illustrations should span the available card width.
- Do not hide A11 at tablet widths.
- `contact-sheet.png` is a QA artifact and must not ship.
