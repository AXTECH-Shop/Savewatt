---
project: SaveWatt
document_role: authoritative_website_builder_entry_point
language: fr-FR
status: ready_for_implementation
last_updated: 2026-06-06
---

# SaveWatt Website Build Handoff

This is the website builder's starting document. It consolidates the approved
scope and points to the detailed source of truth for each implementation area.
If a summary here conflicts with a linked specialist document, use the
specialist document.

## 1. Build Directive

Build a premium, French-first, responsive website for SaveWatt, an independent
French energy-cost optimization consultancy. The website must support light and
dark themes, use the supplied generated raster assets, and prioritize requests
for a free energy-invoice audit.

The public website is entirely French. English copy in planning documents is
for stakeholder review only and must never be rendered in production.

Primary CTA:

```text
Demander un audit gratuit
```

Secondary CTA:

```text
Envoyer une facture récente
```

## 2. Source-of-Truth Map

| Build concern | Authoritative source |
|---|---|
| Homepage layout, final French copy, interactions and responsive behavior | `docs/landingpageplan.md` |
| Colors, typography, grid, components, motion and image handling | `docs/visual-dna.md` |
| Generated asset files and dimensions | `public/assets/generated-v3/README.md` |
| Routes, page roles, navigation and launch scope | `docs/website-plan.md` |
| Positioning, voice and claim guardrails | `docs/branding.md` |
| Messaging alternatives and secondary-page copy direction | `docs/copy-platform.md` |
| Search intent, page themes and structured data | `docs/seo-plan.md` |
| Competitive differentiation | `docs/competitor-analysis.md` |
| Product and business intent | `docs/vision.md` |

Do not use `docs/team-assembly.md` or `docs/skill-stack.md` as product
requirements. They describe the planning process, not the website.

## 3. Launch Scope

### Tier 1: complete implementation

| Route | Purpose |
|---|---|
| `/` | Main long-form conversion homepage |
| `/solution` | Offer narrative: recovery, optimization and monitoring |
| `/methodologie` | Process, required documents, timing and remuneration |
| `/services` | Service overview and future service-page hub |
| `/secteurs` | Sector overview and qualification hub |
| `/secteurs/collectivites` | Public-sector landing page |
| `/secteurs/entreprises-multi-sites` | Multi-site organization landing page |
| `/resultats` | Evidence, illustrative examples and methodology notes |
| `/pourquoi-savewatt` | Independence, expertise, confidentiality and reporting |
| `/faq` | Full objection-handling page |
| `/contact` | Audit request and invoice-upload flow |
| `/mentions-legales` | French legal notice |
| `/politique-de-confidentialite` | Privacy policy |
| `/cookies` | Cookie policy and consent details |

### Tier 2: do not block launch

- Individual service detail pages
- Industry and logistics sector page
- About page
- Resources
- Case studies
- Comparison pages

Build Tier 1 routes so Tier 2 can be added without changing the navigation,
content model or component architecture.

## 4. Global Navigation

Desktop header:

```text
Solution
Méthode
Services
Secteurs
Résultats
FAQ
Contact
Demander un audit gratuit
```

Mobile header keeps the logo, `Audit gratuit` CTA and menu trigger visible.

Footer must include:

- Short SaveWatt positioning statement
- Services and sectors
- FAQ and contact
- Paris address and approved company contact details
- Legal, privacy and cookie links
- Final audit CTA

Never invent company identifiers, phone numbers, email addresses, certifications,
testimonials or measured client results. Use clearly marked content variables
until the client supplies them.

## 5. Homepage Assembly

Build the homepage in this exact order:

| Section | Content source | Primary asset |
|---|---|---|
| Global header | `landingpageplan.md`, section 2 | A01 logo mark |
| Hero | section 3 | A06 desktop/mobile |
| Reassurance strip | section 4 | Live HTML only |
| Le constat | section 5 | A07 desktop/mobile |
| Notre solution | section 6 | A08a-A08f |
| Comment ça marche | section 7 | A09 desktop/mobile |
| À qui s'adresse SaveWatt | section 8 | A10a-A10c |
| Pourquoi SaveWatt | section 9 | A11 desktop/mobile |
| Résultats | section 10 | A12 |
| FAQ | section 11 | Live HTML accordion |
| Final CTA | section 12 | A14 desktop/mobile |
| Global footer | final section | Logo and live HTML |

Use the exact French production copy from `docs/landingpageplan.md`. Do not
rewrite, shorten or translate it during implementation unless a component
constraint is documented first.

## 6. Asset Integration

Approved assets live in:

```text
public/assets/generated-v3/
```

Do not use anything under `public/assets/archive/retro-3d-v1/`. That first
generation was rejected for its retro industrial 3D appearance. Production
assets must follow the colored isometric v3 direction in `visual-dna.md`.

Delivery preference:

1. AVIF
2. WebP fallback
3. PNG fallback or alpha-critical use

Use `<picture>` for assets with AVIF/WebP sources. Desktop and mobile
compositions are independent art direction, not interchangeable crops.

Required responsive pairs:

- A06 hero
- A07 billing anomaly atlas
- A09 process flow
- A11 recovery ledger
- A14 final CTA
- A15 contact upload

The generated illustrations are transparent and must remain uncropped. Use
`object-fit: contain`; never use `cover` for these assets. Preserve their clear
space and do not add colored boxes behind them.

`contact-sheet.png` is QA documentation and must not ship.

## 7. Theme Contract

The site must provide both light and dark themes.

- Light primary surface: warm limestone `#F5F1E8`
- Dark primary surface: deep energy green `#052C24`
- Accent: current green `#B9F43A`
- Accent use is restricted to energy flow, detected anomalies, recovered value,
  validation and primary action emphasis.
- Do not recolor generated assets between themes.
- Persist the user's explicit theme choice.
- Respect the operating-system preference before an explicit choice exists.
- Theme controls require an accessible text label.

The homepage should use intentional light/dark section rhythm even when a user
selects a theme. Theme selection changes the system surfaces and components; it
must not flatten the entire page into one background color.

## 8. Layout and Responsive Contract

Use the tokens and measurements in `docs/visual-dna.md`, sections 3-6.

Minimum requirements:

- Mobile-first implementation
- 12-column desktop layout
- Maximum content container: `1280px`
- Minimum touch target: `44x44px`
- No horizontal overflow at `320px`
- No generated illustration may be clipped at `320px`, `375px`, `768px`,
  `1024px`, `1280px` or `1440px`
- French headings must wrap deliberately; avoid single-word orphan lines
- Tables become accessible stacked cards or horizontal scroll regions on mobile
- Sticky header must not obscure focused elements or anchor destinations

## 9. Interaction and Motion

Follow `docs/visual-dna.md`, section 8, and the section-level motion notes in
`docs/landingpageplan.md`.

- Use a small number of meaningful load and scroll sequences.
- Animate opacity and transforms, not layout dimensions.
- Keep transitions restrained and technically precise.
- Provide visible hover, focus, active, disabled, loading and error states.
- Fully honor `prefers-reduced-motion`.
- FAQ accordions must work with keyboard and screen readers.
- Mobile navigation must trap focus while open and restore focus when closed.

## 10. Forms and Conversion Flow

The audit form should request only information required for qualification:

- Name
- Organization
- Professional email
- Phone, if approved by the client
- Organization or sector type
- Approximate annual energy spend or invoice range
- Optional recent invoice upload
- Consent acknowledgement

Required states:

- Initial
- Field validation
- Upload in progress
- Submission in progress
- Success
- Recoverable error
- File rejected for type or size

Do not expose uploaded invoices through public asset URLs. Validate file type
and size server-side, store securely, and document the retention policy in the
privacy page.

If the backend destination is not yet selected, implement the form UI behind a
replaceable submission adapter and do not simulate a successful production
submission.

## 11. SEO and Metadata

Use page-specific titles, descriptions, canonical URLs, headings and internal
links based on `docs/seo-plan.md`.

Required:

- One descriptive H1 per page
- Logical H2/H3 hierarchy
- French metadata
- Canonical tags
- Open Graph and social metadata using A05
- `Organization` structured data
- `BreadcrumbList` on internal pages
- `Service` schema where applicable
- XML sitemap and robots.txt
- Crawlable HTML copy; never bake SEO text into illustrations

Only add `LocalBusiness` schema after confirming the Paris office is genuinely
public-facing.

## 12. Accessibility and Performance

Target WCAG 2.2 AA.

- Keyboard-complete navigation and forms
- Visible focus treatment in both themes
- Correct labels, landmarks, error associations and status announcements
- Decorative images use empty alt text
- Informative image alt text describes function, not visual decoration
- Color is never the sole carrier of meaning
- Lazy-load below-the-fold images
- Set image width and height to prevent layout shift
- Preload only truly critical fonts and the selected hero source
- Avoid autoplay media and heavy client-side animation libraries unless justified

Performance targets on a representative mobile connection:

- LCP at or below 2.5 seconds
- CLS at or below 0.1
- INP at or below 200 milliseconds

## 13. Content and Legal Guardrails

- Never publish `8 factures sur 10` without an approved source.
- Treat all savings and recovery examples as illustrative until evidence is
  approved.
- Place the qualification specified in `landingpageplan.md` beside every
  illustrative result.
- Keep `Nous ne vendons pas d'énergie` prominent.
- Do not imply SaveWatt is an energy supplier.
- Do not claim guaranteed savings or recovery.
- Legal pages require client-supplied entity details before launch.
- Cookie consent is required only for non-essential tracking and must block that
  tracking until consent is received.

## 14. Recommended Component Boundaries

```text
SiteHeader
MobileNavigation
ThemeControl
PageHero
ReassuranceStrip
ProblemAtlas
ServiceGrid
ProcessFlow
SectorGrid
DifferentiatorGrid
ResultsTable
FaqAccordion
AuditCallToAction
AuditRequestForm
InvoiceUpload
SiteFooter
SeoMetadata
StructuredData
ResponsiveIllustration
```

Keep all user-facing copy in structured content objects or a content layer,
rather than embedding long text directly inside components. This enables later
copy review and CMS migration without rebuilding the UI.

## 15. Builder Acceptance Checklist

- All Tier 1 routes exist and are linked.
- Homepage follows the approved section order and exact French copy.
- All generated assets resolve locally and use the correct art direction.
- Light and dark themes pass visual and contrast checks.
- Mobile layouts have no clipping or horizontal overflow.
- Navigation, FAQ and forms work by keyboard.
- Reduced-motion mode removes non-essential animation.
- Page-specific metadata, canonical links and structured data are present.
- Audit submissions have validation, security and truthful success/error states.
- No unsupported claims or invented company details are published.
- Legal content placeholders are visibly flagged before production deployment.
- Lighthouse and real-browser checks cover mobile and desktop.

## 16. Known Inputs Still Required

These are business inputs, not planning gaps:

- Approved legal company name, registration details and publication director
- Approved phone number and email address
- Confirmation that the Paris address is public-facing
- Final form recipient or CRM integration
- Upload limits, storage location and retention period
- Analytics and consent-platform decision
- Approved evidence for savings, recoveries, testimonials or case studies

The builder can implement the complete site before these arrive by using typed,
clearly named content variables. Production launch must remain blocked until
the legal, contact and data-handling values are approved.
