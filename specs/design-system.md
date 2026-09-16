# Savewatt — Design System

> Implemented baseline for the Next.js platform. It shares SaveWatt's identity with the marketing site while remaining denser and more operational.

## Principles

- **Mobile-first.** Apporteur journeys (create client, upload bill, track commissions) must be fully usable one-handed on a phone. Back-office/finance screens are desktop-dense but must not break < 768px.
- **White-label ready.** Every master can override logo + a small set of brand tokens (primary, accent, logo, PDF charte). Tokens are CSS variables resolved per-tenant at load; never hardcode brand hex in components.
- **Reuse over one-offs.** Platform primitives live in `savewatt-platform/src/components/ui`; workspace patterns live in `components/workspace`.
- **One surface mode** across the app (light default, dark supported via `data-theme`).

## Tokens

```css
:root {
  --brand-deep:    #052C24; /* structural headers and identity */
  --brand-primary: #118A34; /* primary actions and positive flow */
  --brand-signal:  #B7F52A; /* sparing status/highlight signal */
  --bg:            #F5F7F5;
  --surface:       #FDFDFB;
  --text:          #15201D;
  --muted:         #63706C;
  --border:        #DEE4E0;
  --success:       #118A34;
  --warning:       #A15C08;
  --danger:        #B83B31;
  --radius-card:   16px;
}
```

Per-tenant override: `organizations.charte` (JSON) supplies `--brand-primary`, `--brand-accent`, `--logo-url`; injected into a `<style>` root scope after auth.

## Typography

- UI: `Outfit` with system-ui fallback. Figures, identifiers, PDLs and financial tables use `IBM Plex Mono` plus `font-variant-numeric: tabular-nums`.
- Fraunces remains a marketing-site display face and is not used in data-dense platform screens.
- Scale: 12 / 14 / 16 / 20 / 24 / 32. Body 14 back-office, 16 mobile.

## Core components

| Component | Usage |
|---|---|
| `button`, `input`, `select`, `form` (rhf+zod) | Everywhere; server-validated |
| `card` | Contract-actuel recap, comparator summary, dashboard tiles |
| semantic `table` / workspace data patterns | Portfolios, reconciliation anomalies, commissions |
| `PipelineBoard` | Workflow pipeline board by stage with list fallback |
| `dialog`, `sheet` | Confirmations, side panels (bill validation) |
| `tabs`, `accordion` | Client → sites → contracts drill-down |
| `badge` | Workflow stage, RLS scope, offer status, alert flags |
| `toast` (sonner) | Async job feedback (extraction done, PDF ready) |
| `command` | Global entity search (UUID v7, never expose sequential ids) |
| CSS/SVG chart patterns | Consumption graphs, before/after comparator bars; no runtime chart dependency yet |
| `calendar` / date range | Échéancier, monthly close period pickers |

## Signature patterns

- **Bill validation split view:** PDF on the left, extracted fields on the right with per-field **confidence chips** and highlight-to-source. Low-confidence fields flagged amber and focus-first.
- **Comparator card:** per-cadran table (current vs proposed, écart €/MWh, volume, gain €/an), annual + contract-term savings HT/TTC, before/after chart. **Never render Symphonics buy price or margin on client-facing exports.**
- **Alert banner system:** danger/warning inline banners for the fixed alert set (missing cadran → "facture d'hiver requise", HC>HP, offer expiring < 48h, power atteinte = souscrite, reconduction tacite probable).
- **Impersonation banner:** persistent top bar with actor, target, motif, and "exit impersonation".

## Accessibility (WCAG 2.1 AA target)

- Color never the sole signal (alerts pair icon + text).
- All interactive elements keyboard-reachable; focus-visible rings on.
- Form errors announced (aria-live) and tied to inputs.
- Min contrast 4.5:1 for text; check per-tenant brand overrides against a contrast validator at save time.
- Data tables: proper header scope, sortable columns operable by keyboard.
