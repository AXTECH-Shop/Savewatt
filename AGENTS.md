# SaveWatt Website — Agent Guide

## Project Overview

SaveWatt is a static marketing website for an independent French energy-cost optimization consultancy (`bureau d'études en optimisation énergétique`). The site is built as a long-form conversion homepage with planned multi-page expansion. All public-facing content is French (`fr-FR`).

The project contains **no build step, no package manager, and no framework**. It is hand-written vanilla HTML, CSS, and JavaScript deployed as static files to Cloudflare Pages.

## Technology Stack

- **Markup**: HTML5 (single-page landing page structure with semantic landmarks)
- **Styles**: Vanilla CSS3 with custom properties for theming
- **Scripting**: Vanilla ES6+ JavaScript, zero external runtime dependencies
- **Fonts**: Google Fonts (Fraunces + IBM Plex Mono + IBM Plex Sans on main; IBM Plex Mono + IBM Plex Sans on v2)
- **Images**: AI-generated raster illustrations delivered in AVIF / WebP / PNG triples
- **Deployment**: Cloudflare Pages via Wrangler CLI direct upload
- **Platform**: Static site; no server-side runtime, no database, no API backend

## Project Structure

```
.
├── index.html              # Production homepage (primary entry point)
├── styles.css              # Production stylesheet (~660 lines)
├── script.js               # Production JavaScript (~325 lines)
├── index-v2.html           # Swiss design experiment (alternate design)
├── styles-v2.css           # v2 stylesheet
├── script-v2.js            # v2 JavaScript
├── _headers                # Cloudflare Pages security & cache headers
├── README.md               # Human-facing quick start
├── AGENTS.md               # This file
│
├── docs/                   # Planning documentation (source of truth)
│   ├── BUILD-HANDOFF.md    # Authoritative builder entry point
│   ├── landingpageplan.md  # Homepage layout, copy, motion, responsive rules
│   ├── visual-dna.md       # Colors, typography, grid, component, asset specs
│   ├── seo-plan.md         # Page themes, structured data, internal linking
│   ├── branding.md         # Positioning, voice, tone, approved messaging
│   ├── copy-platform.md    # Messaging alternatives & secondary-page copy
│   ├── website-plan.md     # Sitemap, page roles, navigation plan
│   ├── competitor-analysis.md
│   ├── vision.md
│   ├── skill-stack.md      # Planning-process skill inventory (not a product req)
│   └── team-assembly.md    # Planning process only
│
├── public/assets/
│   ├── generated-v3/       # Approved production assets (AVIF/WebP/PNG)
│   ├── archive/retro-3d-v1/# Rejected first-generation assets — do not use
│   └── generated/README.md # Asset register and delivery rules
│
├── scripts/
│   └── deploy-wrangler.sh  # Deployment script
│
├── tmp/                    # Temporary image-generation outputs
└── .deploy-site/           # Clean deployment staging folder (gitignored)
```

## Two Active Variants

The repo maintains two parallel design implementations. **Only `index.html` is the production entry point**; `index-v2.html` is an experimental Swiss-style redesign.

| Aspect | Production (`index.html`) | Experiment (`index-v2.html`) |
|---|---|---|
| Display font | Fraunces (serif) | None (sans-serif only) |
| Motion | Scroll-driven 3D tilt on images (`data-scroll-image`) | Simpler, fewer effects |
| CSS size | ~661 lines | ~617 lines |
| JS size | ~324 lines | ~177 lines |
| Query string | `?v=20260607-13` | `?v=20260607-swiss-3` |

When editing, be explicit about which variant you are changing. Do not let the two drift in shared content (e.g., French copy, metadata, form logic) unless the change is intentionally variant-specific.

## Local Development

Preview the site locally with any static file server:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

There is **no build step**, **no transpilation**, and **no dependency installation**.

## Deployment

Deploy to Cloudflare Pages using the provided script:

```bash
./scripts/deploy-wrangler.sh [PROJECT_NAME]
```

The script:
1. Creates a clean `.deploy-site/` directory.
2. Copies `index.html`, `index-v2.html`, `styles.css`, `styles-v2.css`, `script.js`, `script-v2.js`, and `_headers`.
3. Copies `public/assets/generated-v3/` into the deploy folder.
4. Creates the Pages project if missing.
5. Deploys with the current Git commit hash and message.

Requirements:
- `wrangler` CLI installed and authenticated.
- `zsh` shell (the script uses `set -euo pipefail`).

### Cache & Security Headers

The `_headers` file sets:
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) on all responses.
- `Cache-Control: public, max-age=31536000, immutable` for assets under `/public/assets/*`.
- `Cache-Control: public, max-age=0, must-revalidate` for HTML files.

## Code Organization Conventions

### HTML
- One H1 per page, logical H2/H3 hierarchy.
- French copy is the production source; English in `docs/` is for stakeholder review only.
- Data attributes (`data-*`) are the contract between HTML and JS:
  - `data-theme-toggle`, `data-theme-label`
  - `data-menu-toggle`, `data-mobile-menu`
  - `data-header`
  - `data-audit-form`, `data-form-status`
  - `data-file-input`, `data-file-note`
  - `data-scroll-image`, `data-motion-depth`, `data-motion-rotate`
- Skip-link for accessibility: `<a class="skip-link" href="#contenu">`

### CSS
- Custom properties in `:root` define the light-theme palette; `[data-theme="dark"]` overrides a subset.
- CSS variables for layout: `--container` (max 1280px), `--reading` (max 840px).
- Section spacing: `.section-light`, `.section-inset`, `.section-dark` with `padding-block: 112px`.
- Mobile-first responsive design; no CSS framework.
- `overflow-x: clip` on `body` to prevent horizontal scroll.

### JavaScript
- No bundler; scripts are loaded directly.
- Feature-detection and defensive null-checking with optional chaining (`?.`) everywhere.
- Theme logic: checks `localStorage`, then OS preference, defaults to `light`.
- Mobile menu: toggles `hidden`, `aria-expanded`, traps focus, restores on `Escape`.
- Scroll effects: `IntersectionObserver` for `.reveal` animations; `requestAnimationFrame` + scroll/resize listeners for image motion.
- Form: client-side validation only; `submitAuditRequest` explicitly throws because the backend connector is not yet configured.

## Theme System

- Light primary surface: warm limestone `#F5F1E8`
- Dark primary surface: deep energy green `#052C24`
- Accent (current green): `#B9F4A` / `#118a34` — reserved for energy flow, anomalies, recovered value, and primary actions.
- The site supports both light and dark themes via a toggle button. The user's choice is persisted in `localStorage`.
- Even when a theme is selected, the page uses an intentional light/dark section rhythm; theme selection changes system surfaces and components but does not flatten the whole page into one background color.
- Respect `prefers-reduced-motion`: all non-essential motion is skipped when this media query matches.

## Asset Handling

- **Approved assets live in `public/assets/generated-v3/` only.**
- Do **not** use anything under `public/assets/archive/retro-3d-v1/` — that generation was rejected.
- Delivery preference per asset: AVIF → WebP → PNG fallback.
- Use `<picture>` elements for art-directed responsive pairs (desktop + mobile).
- Required responsive pairs: A06 hero, A07 billing anomaly atlas, A09 process flow, A11 recovery ledger, A14 final CTA, A15 contact upload.
- Generated illustrations have transparent backgrounds and must remain uncropped (`object-fit: contain`, never `cover`).
- `contact-sheet.png` is QA documentation and must not ship.

## Forms & Conversion Flow

The audit request form (`#demande-audit`) collects:
- Name, organization, professional email, phone
- Organization/sector type, approximate annual energy spend
- Optional recent invoice upload (PDF or image, max 10 MB)
- Consent acknowledgement

**Important**: `submitAuditRequest()` currently throws `"Le connecteur de soumission n'est pas encore configuré."` The form UI is implemented, but there is no production backend. Do not simulate a successful production submission.

## Accessibility & Performance Targets

- Target: WCAG 2.2 AA.
- Keyboard-complete navigation and forms.
- Visible focus treatment in both themes.
- Correct ARIA labels, landmarks, error associations, and status announcements.
- Decorative images use empty `alt=""`; informative images describe function.
- Color is never the sole carrier of meaning.
- Lazy-load below-the-fold images; set explicit `width` and `height` to prevent CLS.
- Mobile performance targets: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms.

## SEO & Metadata

- Page-specific `<title>`, `<meta name="description">`, canonical links, Open Graph tags, and `theme-color`.
- Structured data: `Organization` schema (JSON-LD) is present on both variants.
- Future pages should add `BreadcrumbList`, `Service`, and potentially `LocalBusiness` schema.
- XML sitemap and `robots.txt` are planned but not yet implemented.
- All crawlable copy must remain live HTML; never bake SEO text into illustrations.

## Content & Legal Guardrails

- **Never** invent company identifiers, phone numbers, email addresses, certifications, testimonials, or measured client results.
- Do **not** publish the claim "8 factures sur 10" without an approved source.
- Treat all savings/recovery examples as illustrative until evidence is approved.
- Keep "Nous ne vendons pas d'énergie" prominent.
- Do not imply SaveWatt is an energy supplier.
- Do not claim guaranteed savings or recovery.
- Legal pages require client-supplied entity details before launch.

## Testing

There is no automated test suite. Verify changes manually:

1. Start the local server (`python3 -m http.server 8000`).
2. Check both `http://localhost:8000/` (production) and `http://localhost:8000/index-v2.html` (experiment).
3. Test responsive behavior at 320px, 375px, 768px, 1024px, 1280px, and 1440px.
4. Test keyboard navigation (Tab, Shift+Tab, Enter, Escape).
5. Test with `prefers-reduced-motion: reduce` enabled.
6. Test light/dark theme toggle and persistence across reloads.
7. Run Lighthouse for mobile and desktop.
8. Validate structured data with Google's Rich Results Test.

## Security Considerations

- Security headers are declared in `_headers` and applied at the CDN level.
- File upload validation exists client-side (type and size), but **server-side validation is required before production**.
- Do not expose uploaded invoices through public asset URLs.
- No analytics or third-party tracking scripts are currently loaded.
- Cookie consent is only required for non-essential tracking; since none is present, no consent banner is needed yet.

## Editing Checklist

Before committing changes:

- [ ] French copy matches the approved source in `docs/landingpageplan.md` (do not rewrite or translate unless explicitly instructed).
- [ ] Both `index.html` and `index-v2.html` remain structurally consistent if the change is not variant-specific.
- [ ] Asset paths point to `public/assets/generated-v3/` and use the correct format fallback chain.
- [ ] CSS custom properties are used for colors; do not hardcode hex values outside `:root` or `[data-theme="dark"]`.
- [ ] All new JS selectors use `data-*` attributes and include defensive null-checks (`?.`).
- [ ] Accessibility attributes (`aria-label`, `aria-expanded`, `aria-invalid`, `aria-controls`) are maintained or added.
- [ ] Query-string cache-busters on `styles.css` and `script.js` are bumped if the file contents changed.
- [ ] No horizontal overflow at 320px.
- [ ] `.deploy-site/` is gitignored and not committed.
