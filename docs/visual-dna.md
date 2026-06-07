# SAVEWATT - VISUAL DNA, PAGE ART DIRECTION & ASSET SYSTEM

## Swiss Technical Editorial x Colored Isometric Explainers

### Version 3.0 - French master - 6 June 2026

---

> **PURPOSE**
>
> This document is the single source of truth for SaveWatt's visual language and generated asset production. It combines the former visual DNA and asset prompt documents into one specification.
>
> It defines:
>
> - foundational design principles
> - color, typography, grid, spacing, component, and motion rules
> - responsive art direction for desktop, tablet, and mobile
> - section-by-section landing page visual blueprints
> - the complete website asset register
> - exact dimensions, aspect ratios, safe zones, localization buckets, filenames, and paste-ready prompts
> - French text that may appear inside assets
>
> **Language rule:** the public website and all text-bearing assets are French-first. English appears only in planning documents as a tone-check translation. Generated production assets must use French text unless the asset is explicitly language-neutral.

---

## 1. BRAND READING

SaveWatt is an independent French energy-cost audit office. The visual system must feel forensic, credible, precise, and quietly premium.

The brand is not:

- an energy supplier
- a generic green startup
- a solar or sustainability lifestyle brand
- a dashboard-first SaaS product

The visual story is:

```
COMPLEX ENERGY SPEND
        ↓
AUDIT AND TRACE
        ↓
ANOMALY FOUND
        ↓
VALUE RECOVERED
        ↓
CONTRACT OPTIMIZED
```

The current-green accent represents verified movement through that system: a traced anomaly, a validated correction, a recovered amount, or an active process step.

### 1.1 Logo mark invariant

The SaveWatt icon must follow the supplied reference exactly:

- rounded lime-green square face
- dark forest-green rounded backing visible as a thick lower-left inset/shadow
- centered sharp black lightning bolt
- no abstract `S`
- no plug, leaf, sun, meter, or additional symbol
- compact, bold silhouette that remains readable at favicon size

The icon is a brand invariant. Illustration prompts may use its lime-square-and-bolt language, but must not redraw or reinterpret the logo itself.

### 1.2 Illustration language

Website illustrations use premium colored isometric explainers matching the
approved white-background hero sample:

- sophisticated enterprise technical illustration on warm white
- fine architectural outlines with restrained believable isometric depth
- recognizable buildings, invoices, charts and business documents
- selective pale mint, sky blue, navy, limestone, amber and coral fills
- current green creates the directional audit and recovery route
- small French callout cards connect directly to the object they explain
- soft contact shadows fade naturally into the white canvas
- white remains at least 65% of every large illustration
- no dark enclosing rectangle, glossy 3D icon or isolated decorative object

Every generated illustration must remain readable on both:

- light mode: warm limestone `#F5F1E8`
- dark mode: deep energy green `#052C24`

Large explainers use a warm-white edge-to-edge canvas (`#FCFCF9`) that blends
into light sections. In dark mode, display the identical asset inside a
warm-white technical plate with a `1px` translucent current-green keyline,
`16-24px` radius and restrained shadow. Do not invert, recolor or regenerate
different geometry for dark mode.

Small service and sector explainers use a warm-white square canvas with pale
filled objects, navy outlines and current-green actions. In dark mode the
square canvas becomes the technical plate; do not remove it.

### 1.3 Visual comprehension contract

Every illustration must communicate one plain-language sentence without relying
on surrounding copy. Pass the three-second test before production:

1. The viewer can immediately name the starting object.
2. The problem or action is visibly marked at a specific location.
3. Arrows or paths have an unambiguous direction.
4. The final outcome is recognizable and visibly better than the starting state.

Use no more than four primary story stages in one illustration. Each stage may
contain supporting architectural detail, but it must remain subordinate.
Prefer familiar business symbols:

- invoice sheet with rows
- highlighted incorrect line
- magnifying scan frame
- euro amount or return arrow
- organization building
- contract sheet
- check mark
- simple comparison bars

Do not invent abstract machines, black boxes, control panels, unexplained nodes
or decorative data structures. If an object needs a paragraph to explain it,
the concept has failed.

### 1.4 Semantic visual grammar

| Meaning | Visual treatment |
|---|---|
| Client input | Plain invoice or contract outline |
| Potential error | One row displaced, duplicated or marked with a small warning |
| SaveWatt analysis | Rectangular scan frame or magnifying cursor crossing real rows |
| Confirmed error | Exact row changes to current green and receives a small check |
| Recovery | Clear euro arrow returning from supplier side to client building |
| Optimization | Before/after contract comparison with the lower valid value selected |
| Monitoring | Simple recurring loop around a verified invoice, never an analogue dial |
| Connection | Directed current-green line with arrowhead |

Light and dark versions must preserve identical geometry. Only structural
line color changes between themes.

---

## 2. CORE PRINCIPLES

| # | Principle | Application |
|---|---|---|
| 1 | **Grid first.** | Every page and generated visual snaps to a 12-column grid with an 8px base spacing unit. |
| 2 | **French first.** | Website copy, labels, captions, forms, diagrams, metadata, and accessibility text ship in French. |
| 3 | **Mobile is composed, not cropped.** | Critical visual content must fit inside a mobile-specific composition. Never rely on a desktop crop. |
| 4 | **One accent, one meaning.** | Current green indicates flow, anomaly detection, recovery, validation, or active state only. |
| 5 | **Evidence over decoration.** | Every illustration must clarify a mechanism, a problem, a process, or a proof point. |
| 6 | **Explanatory, not decorative.** | Use colored isometric business scenes where every object supports a visible cause-and-effect story. |
| 7 | **HTML carries meaning.** | Headlines, claims, metrics, tables, CTAs, legal text, and most labels remain live HTML. |
| 8 | **Whitespace is structure.** | Sparse composition and deliberate empty space create authority and make technical content legible. |
| 9 | **Motion shows traceability.** | Lines draw, nodes validate, and numbers settle. Motion never exists only to entertain. |
| 10 | **Claims stay qualified.** | Illustrative savings and unverified statistics must be visibly labeled as examples, not guarantees. |

---

## 3. COLOR SYSTEM

### 3.1 Primary palette

| Role | Hex | Use |
|---|---|---|
| Deep energy background | `#052C24` | Hero, final CTA, footer, selected dark sections |
| Deep energy surface | `#0A3A30` | Dark cards, navigation glass, dark asset backgrounds |
| Warm limestone | `#F5F1E8` | Main light page background and illustration canvas |
| Limestone inset | `#E8E2D6` | Alternate sections, cards, diagram panels |
| Structural ink | `#182126` | Primary text, technical linework, icons |
| Mineral grey | `#6C7A80` | Secondary text, inactive diagram structure |
| Hairline grey | `#C9C5BA` | Borders and construction grids |
| Current green | `#B9F43A` | Primary accent, CTA, signal, verified recovery |
| Current green dark | `#8FD11F` | Hover/pressed state and high-density diagrams |
| Illustration white | `#FCFCF9` | Seamless canvas for all large explainer assets |
| Illustration navy | `#17345B` | Data rows, roofs and analytical contrast |
| Illustration mint | `#DDF2E4` | Selected building and validation surfaces |
| Illustration sky | `#DDEBFA` | Secondary analysis panels |
| Anomaly amber | `#F4B24B` | Warning and suspected anomaly only |
| Anomaly coral | `#E97862` | Confirmed incorrect charge only |
| Text on current green | `#052C24` | CTA and badge text |
| Text on deep background | `#F8F7F2` | Primary dark-surface text |
| Muted text on deep | `#B7C4BF` | Secondary dark-surface text |

### 3.2 Accent opacity ladder

```css
#B9F43A       /* primary CTA, active path, final validation */
#B9F43ACC     /* hover and emphasis */
#B9F43A66     /* focused border and active node */
#B9F43A33     /* soft signal field */
#B9F43A14     /* faint current wash */
```

### 3.3 Accent rule

Current green may represent:

- an active energy/current path
- a flagged billing anomaly
- a corrected contract parameter
- a recovered euro amount
- a completed process step
- a primary CTA

It may not be used:

- as a large decorative background
- for normal body text
- on every icon
- as arbitrary card fill
- to imply environmental impact without evidence

### 3.4 Surface rhythm

Recommended landing page sequence:

1. Hero: deep energy background
2. Reassurance strip: deep energy surface
3. Problem: warm limestone
4. Solution: warm limestone
5. Process: limestone inset
6. Audience: warm limestone
7. Why SaveWatt: deep energy background
8. Results: warm limestone
9. FAQ: limestone inset
10. Final CTA: deep energy background

---

## 4. TYPOGRAPHY

### 4.1 Font stack

Display:

```css
font-family: "Fraunces", "Cormorant Garamond", Georgia, serif;
```

Interface and body:

```css
font-family: "IBM Plex Sans", "Hanken Grotesk", system-ui, sans-serif;
```

Metrics and technical labels:

```css
font-family: "IBM Plex Mono", ui-monospace, monospace;
```

The serif display face connects the website to the existing SaveWatt brochure while the Plex families provide technical precision.

### 4.2 Type scale

| Role | Mobile | Tablet | Desktop | Weight | Notes |
|---|---:|---:|---:|---|---|
| Hero display | `44-56px` | `64px` | `80-96px` | 500 | Max 3 lines desktop, 4 lines mobile |
| H1 inner page | `40px` | `52px` | `64px` | 500 | Balanced wrap |
| H2 | `32px` | `40px` | `48-56px` | 500 | Max 3 lines |
| H3 | `22px` | `24px` | `28px` | 500 | Sans or serif by context |
| Lede | `18px` | `19px` | `20px` | 400 | Max 58ch |
| Body | `16px` | `16px` | `17px` | 400 | 1.65 line height, max 62ch |
| Small | `14px` | `14px` | `14px` | 400 | Supporting detail |
| Kicker | `12px` | `12px` | `12px` | 600 | Uppercase, 0.18em tracking |
| Metric | `48px` | `56px` | `64-72px` | 400 | IBM Plex Mono |

### 4.3 Typography rules

- French punctuation and accents must be correct.
- No all-caps paragraphs.
- Display lines should not become narrow six-line towers.
- Body copy stays below `62ch`.
- Metrics use tabular figures.
- Claims receive a visible source or qualification line.

---

## 5. GRID, CONTAINERS & SPACING

### 5.1 Breakpoints

| Name | Range | Design behavior |
|---|---|---|
| Mobile | `375-639px` | Single-column; mobile-specific asset composition |
| Tablet | `640-1023px` | 6-column or compressed 12-column |
| Desktop | `1024-1439px` | Full 12-column composition |
| Wide | `1440px+` | Same content width with larger outer margins |

### 5.2 Containers

```css
--container-main: min(1280px, calc(100vw - 48px));
--container-reading: min(760px, calc(100vw - 40px));
--container-wide: min(1440px, calc(100vw - 64px));
```

Mobile side padding: `20px`.
Tablet side padding: `32px`.
Desktop side padding: `48px`.

### 5.3 12-column grid

Desktop:

```css
grid-template-columns: repeat(12, minmax(0, 1fr));
column-gap: 24px;
```

Mobile:

```css
grid-template-columns: minmax(0, 1fr);
row-gap: 32px;
```

### 5.4 Vertical rhythm

| Token | Mobile | Desktop | Use |
|---|---:|---:|---|
| Compact | `48px` | `64px` | Trust strip |
| Standard | `72px` | `112px` | Core sections |
| Feature | `88px` | `144px` | Hero, process, proof |
| Finale | `96px` | `160px` | Final CTA |

---

## 6. COMPONENT VOCABULARY

### 6.1 Navigation

- Floating or inset dark slab on desktop, max-width aligned to content.
- Wordmark left.
- Navigation center.
- Primary CTA right.
- Mobile: wordmark, short CTA, menu trigger.
- Height: `72px` desktop, `64px` mobile.
- No pill-shaped navigation.

### 6.2 Primary button

- Background: `#B9F43A`
- Text: `#052C24`
- Minimum height: `48px` desktop, `52px` mobile
- Border radius: `999px` only for CTA buttons, reflecting the brochure
- Horizontal padding: `24-28px`
- Hover: darken to `#8FD11F`, translate `-1px`
- Focus: 2px current-green ring with 3px offset

### 6.3 Secondary button

- Transparent
- 1px border in current green or structural ink
- Same height as primary
- No competing fill

### 6.4 Cards

- Rectilinear or lightly rounded `12px`
- No floating shadow stack
- Use border, surface contrast, and spacing
- Cards on deep green use `rgba(255,255,255,0.06)` with hairline border

### 6.5 Metrics

- Large mono figure
- Supporting label below
- Source or qualification directly adjacent
- No baked-in metric text in raster assets

### 6.6 Forms

- Labels always visible
- Minimum input height `52px`
- Clear privacy note below document upload
- Upload may be deferred; one recent invoice is enough to begin

---

## 7. ICONOGRAPHY

### 7.1 UI icons

- Lucide or equivalent thin-line family
- Stroke `1.5-1.75`
- Default structural ink or muted text color
- Current green only for active/validated state

### 7.2 Custom asset glyphs

Custom raster glyphs use:

- square `512x512` generation canvas
- transparent PNG master, delivered as transparent WebP
- rendered at `96x96` or `160x160` in the interface
- colored isometric enterprise illustration with crisp navy outlines
- pale white, mint, sky-blue and limestone object fills
- one current-green action or validated outcome
- soft white perimeter/halo for dark-surface compatibility
- soft contact shading contained inside the transparent silhouette
- no embedded title
- no more than one current-green signal per glyph

---

## 8. MOTION LANGUAGE

Motion expresses traceability.

| Element | Motion |
|---|---|
| Hero current path | `stroke-dashoffset` draw, 1.4s on entrance; subtle 4s pulse afterward |
| Section reveal | `translateY(16px)` + opacity, 500-700ms |
| Process line | Draws progressively between nodes as section enters |
| Validation node | Scale `0.96 -> 1`, green ring fades in |
| Metric | Count-up once, 900-1200ms |
| Buttons | 150ms state transition; no magnetic cursor |
| Cards | No floating/bobbing loops |

`prefers-reduced-motion`:

- render all content immediately
- disable line-draw loops
- preserve state using static green paths
- never hide information behind animation

---

## 9. RESPONSIVE IMAGE ART DIRECTION

### 9.1 Non-cropping rule

Every critical generated visual must have two compositions:

- Desktop/tablet master
- Mobile portrait master

Do not generate one desktop image and crop it for mobile.

### 9.2 Safe zones

Desktop:

- Keep critical subjects within the central `84%` width and `82%` height.
- Maintain `8%` horizontal and `9%` vertical clear space.

Mobile:

- Keep critical subjects within the central `88%` width and `86%` height.
- Maintain `6%` horizontal and `7%` vertical clear space.
- No tiny labels below `18px` at a 1080px-wide source.

### 9.3 Source sizes

| Usage | Desktop source | Mobile source | Delivery |
|---|---|---|---|
| Hero | `1600x1200` 4:3 | `1080x1350` 4:5 | PNG master, AVIF + WebP delivery |
| Split-section visual | `1200x1200` 1:1 | derive `1080x1080` | PNG master, AVIF + WebP delivery |
| Process diagram | `1800x900` 2:1 | `1080x1440` 3:4 | PNG masters, AVIF + WebP delivery |
| Wide support band | `1800x600` 3:1 | `1080x1080` 1:1 | PNG masters, AVIF + WebP delivery |
| OG image | `1200x630` 1.91:1 | n/a | PNG/WebP |
| Icon/glyph | `512x512` master | same | transparent PNG + WebP |
| Favicon/app mark | `1024x1024` PNG master | `16,32,48,180,512,1024` exports | PNG |

### 9.4 HTML delivery rule

Use `<picture>` for assets with mobile art direction:

```html
<picture>
  <source media="(max-width: 639px)" srcset="/assets/hero-audit-mobile-fr.avif">
  <source media="(min-width: 640px)" srcset="/assets/hero-audit-desktop-fr.avif">
  <img
    src="/assets/hero-audit-desktop-fr.webp"
    alt="Schéma SaveWatt reliant factures, anomalies détectées et économies récupérées."
    width="1600"
    height="1200"
  >
</picture>
```

---

## 10. LANDING PAGE VISUAL BLUEPRINT

### 10.1 Header

- Deep green floating/inset navigation.
- Actual SaveWatt wordmark.
- Desktop nav: `Solution`, `Méthode`, `Secteurs`, `Résultats`, `FAQ`.
- CTA: `Demander un audit gratuit`.
- Mobile: logo, `Audit gratuit`, menu trigger.

### 10.2 Hero

Desktop:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
├──────────────────────────────┬──────────────────────────────┤
│ KICKER                       │                              │
│ H1                           │ ASSET A06-D                  │
│ LEDE                         │ 4:3 technical illustration   │
│ CTA + secondary action       │ HTML callout overlays        │
│ trust line                   │                              │
└──────────────────────────────┴──────────────────────────────┘
```

- Copy: columns `1-7`
- Visual: columns `8-12`
- Minimum desktop hero height: `760px`
- Visual frame: `min(46vw, 620px)` wide
- Do not crop the illustration.

Mobile:

- Copy first, full width.
- CTAs stack.
- Hero image appears below CTA at `width: 100%`, aspect `4:5`.
- No HTML callout may sit outside the image frame.

### 10.3 Reassurance strip

- Four live HTML proof statements.
- No generated image.
- Horizontal desktop, 2x2 tablet, vertical mobile.

### 10.4 Problem

- Desktop 5/7 split.
- Copy left, `A07-D` square anomaly atlas right.
- Mobile: copy, then `A07-M` square visual.

### 10.5 Solution

- Six HTML service cards.
- `A08a-f` glyphs only.
- Desktop 3x2, tablet 2x3, mobile single column.

### 10.6 Process

- Light inset section.
- Desktop: `A09-D` wide flow occupies full container below intro.
- Mobile: `A09-M` vertical flow.
- Keep captions in HTML where practical.

### 10.7 Audience

- Three sector cards with HTML copy.
- `A10a-c` small sector glyphs.
- No large generated background.

### 10.8 Why SaveWatt

- Dark inversion section.
- Six proof points in structured rows.
- Optional `A11` ledger-return illustration at right on desktop.
- Hide decorative support asset on mobile only if it adds no information.

### 10.9 Results

- HTML table and metrics.
- Optional `A12` colored verification explainer.
- Never generate fake charts or baked-in financial claims.

### 10.10 FAQ

- Open Q&A blocks for crawlability.
- No generated illustration.
- Use reusable `A13` FAQ marker.

### 10.11 Final CTA

- Dark background.
- Typographic CTA.
- `A14` support line may sit beneath copy.

### 10.12 Footer

- Deep green.
- Logo, descriptor, navigation, contact details, legal links.
- No generated office photography or fake partner logos.

---

## 11. UNIVERSAL IMAGE-GENERATION RULES

### 11.1 Style prefix

Prepend this paragraph verbatim to every SaveWatt asset prompt:

> *Premium contemporary colored isometric technical illustration for SaveWatt, French energy-cost audit brand, matching the approved enterprise white-canvas hero sample: warm-white #FCFCF9 dominant background, fine crisp architectural outlines, restrained believable isometric depth, recognizable invoices, buildings, charts and business documents, deep forest #063B31 and navy #17345B structural details, pale mint #DDF2E4, soft sky #DDEBFA, limestone #EEE9DD and cool grey #A8B2B8 secondary surfaces, current green #65C33B reserved for audit paths, arrows, validation and recovered value, warm amber #F4B24B and coral #E97862 reserved only for detected errors, precise French callout cards with thin green leader lines where specified, soft shadows fading seamlessly into white, generous negative space, high-resolution premium 2026 French enterprise consultancy art direction.*

### 11.2 Universal negative prompt

> *No dark background except A05, no monochrome empty line art, no isolated icon floating without context, no glossy or chunky 3D product render, no retro-futurism, no World War II aesthetic, no steampunk, no dieselpunk, no military equipment, no analogue machinery, no gauges or speedometers, no dials, no knobs, no brass, no leather, no wallets, no safes, no bulky bases or pedestals, no beige molded plastic, no toy-like object, no stock photo, no generic eco leaves, no blue-purple SaaS gradient, no rainbow palette, no excessive bloom, no clipped subject, no English text in production assets, no invented logos, no fake customer logos, no watermark.*

### 11.3 Text rules

- French is the generation master.
- Use exact strings provided below.
- Keep text limited to short technical labels.
- Large headlines remain HTML.
- Verify every generated French string. If any accented word, number or label is
  incorrect, regenerate that asset rather than shipping malformed text.

### 11.4 Prompt comprehension block

Append this instruction to every explanatory asset prompt:

> *The visual must be understandable in three seconds. Use at most four primary story stages. Show a clear starting object, one visibly marked action or problem, directional arrows, and one recognizable beneficial outcome. Every callout must point to the object it explains. No unexplained abstract nodes or decorative machinery.*

---

## 12. LOCALIZATION CLASSIFICATION

| Bucket | Definition | SaveWatt rule |
|---|---|---|
| `A` Text-bearing | Contains short French labels | Generate French master; English review variant only when needed |
| `B` Brand-fixed | Contains `SaveWatt` or universal codes | One asset |
| `C` Text-free | Geometry/icon only | Reserved for CSS-only or purely decorative elements |

Production language:

- French `fr`: required
- English `en`: planning/review only, not required for launch assets

File naming:

```text
[id]-[name]-[viewport]-[locale].[ext]
```

Examples:

```text
A06-hero-audit-desktop-fr.png
A06-hero-audit-mobile-fr.png
A09-process-flow-desktop-fr.png
A09-process-flow-mobile-fr.png
```

---

## 13. ASSET REGISTER

| ID | Asset | Section/surface | Desktop | Mobile | Bucket | Priority |
|---|---|---|---|---|---|---|
| `A01` | Favicon and app mark | Sitewide | 1024x1024 PNG master | 16/32/48/180/512/1024 PNG exports | B | Critical |
| `A02` | Primary wordmark lockup | Header | transparent PNG/WebP | compact PNG/WebP | B | Critical |
| `A03` | Stacked lockup | Footer/docs | transparent PNG/WebP | same | B | High |
| `A04` | Social avatar mark | Social/profile | 1024x1024 | same | B | High |
| `A05` | Default OG image | Social share | 1200x630 | n/a | B | Critical |
| `A06` | Hero audit-to-recovery system | Hero | 1600x1200 4:3 | 1080x1350 4:5 | A | Critical |
| `A07` | Billing anomaly atlas | Problem | 1200x1200 1:1 | derived 1080x1080 | A | High |
| `A08a-f` | Six service explainers | Solution | 6 x 512x512 white-canvas PNG | same masters | A | Critical |
| `A09` | Four-step process flow | Process | 1800x900 2:1 | 1080x1440 3:4 | A | Critical |
| `A10a-c` | Sector explainers | Audience | 3 x 512x512 white-canvas PNG | same masters | A | Medium |
| `A11` | Recovery traceability visual | Why SaveWatt | 1000x1200 5:6 | derived 900x1080 | A | Medium |
| `A12` | Results verification explainer | Results | 512x512 white-canvas PNG | same master | A | Low |
| `A13` | FAQ marker | FAQ | CSS component | same | C | Low |
| `A14` | Final CTA explainer | CTA/footer | 1800x360 5:1 | 1080x720 3:2 | A | Low |
| `A15` | Document upload illustration | Contact | 1200x1000 6:5 | 1080x1080 1:1 | A | High |
| `A16` | Sector OG template | Sector pages | 1200x630 | n/a | A | Phase 2 |

### 13.1 AI-generation count

For the complete launch website, generate **22 unique raster masters**:

**Generation status (June 6, 2026): v3 production complete.** The 22 approved
masters and their delivery derivatives are stored in
`public/assets/generated-v3/`. Only this v3 family may be used in production.

| Group | Generations |
|---|---:|
| Favicon/app mark (`A01`) | 1 |
| Default OG image (`A05`) | 1 |
| Hero desktop + mobile (`A06`) | 2 |
| Anomaly atlas square master (`A07`) | 1 |
| Six service glyphs (`A08a-f`) | 6 |
| Process desktop + mobile (`A09`) | 2 |
| Three sector glyphs (`A10a-c`) | 3 |
| Recovery ledger master (`A11`) | 1 |
| Results glyph (`A12`) | 1 |
| Final CTA desktop + mobile (`A14`) | 2 |
| Contact illustration desktop + mobile (`A15`) | 2 |
| **Total unique AI generations** | **22** |

Not counted as separate AI generations:

- `A02` and `A03`: compose from the approved SaveWatt logo/wordmark
- `A04`: derive from the `A01` master
- `A13`: implement in CSS
- smaller favicon sizes: resize from the `A01` master
- `A07` mobile: resize from the same square master
- `A11` mobile: resize from the same 5:6 master
- `A16`: Phase 2 and preferably generated dynamically with real text

### 13.2 Delivery formats

- AI generation master: high-quality PNG
- Website primary: AVIF
- Website fallback: WebP
- White-canvas explainers: AVIF/WebP with PNG fallback
- OG image: PNG or WebP
- Favicon/app icons: PNG exports
- No AI-generated asset is required in SVG format

---

## 14. PASTE-READY ASSET PROMPTS

### A01 - Favicon and app mark

**Files**

- `A01-favicon-16.png`
- `A01-favicon-32.png`
- `A01-favicon-48.png`
- `A01-apple-touch-180.png`
- `A01-app-512.png`

**Prompt**

> Reproduce the supplied SaveWatt icon faithfully: a compact rounded lime-green square face in #B9F43A, a thick dark forest-green rounded backing offset toward the lower-left to create the same inset shadow, and one centered sharp black lightning bolt matching the reference silhouette. No abstract letter S, no extra symbols, no text. Strong compact silhouette, optically centered, 18% clear padding, readable at 16px, clean 1024x1024 transparent PNG.

**Negative additions**

> No abstract S, no plug icon, no leaf, no sun, no circle badge, no invoice detail, no alternate lightning shape, no added glow.

### A02 - Primary horizontal wordmark

**Format:** transparent PNG master, target box `1260x288`, delivered as WebP.

**Text:** `SaveWatt`

**Manual production preferred.**

**Spec**

- Use the existing wordmark form from the brochure as the starting reference.
- `Save` in off-white or structural ink depending on surface.
- `Watt` in current green.
- Mark left, wordmark right.
- Clear space equals the mark width.

**Prompt for exploration**

> [STYLE PREFIX] A refined horizontal logo lockup for the French brand "SaveWatt", compact current-bolt mark on the left and editorial wordmark on the right. Exact visible text: "SaveWatt". Use a confident serif for the wordmark with "Save" in structural ink #182126 and "Watt" in current green #B9F43A. Transparent background, no descriptor, no additional symbol, no tagline, high-resolution raster output.

### A03 - Stacked wordmark

**Format:** transparent PNG master, target box `1280x720`, delivered as WebP.

**Text**

```text
SaveWatt
Bureau d'études en optimisation énergétique
```

Use the descriptor as live text in HTML whenever possible. The generated asset should normally contain only `SaveWatt`.

### A04 - Social avatar

**Format:** `1024x1024`, export `512x512`.

**Prompt**

> [STYLE PREFIX] A centered SaveWatt current-bolt mark in luminous current green #B9F43A on a deep energy green #052C24 square canvas, 22% safe padding, no text, no border, no shadow, bold flat vector silhouette readable at 32px.

### A05 - Default OG image

**Format:** `1200x630`, PNG/WebP.

**Safe zone:** keep all text and logo inside `x=72-1128`, `y=64-566`.

**French text**

```text
SaveWatt
Récupérez ce que vos factures d'énergie vous ont coûté en trop.
Audit gratuit · Honoraires au résultat
```

**Prompt**

> [STYLE PREFIX] A 1200x630 warm-white French social card. Left: SaveWatt wordmark, exact headline "Récupérez ce que vos factures d'énergie vous ont coûté en trop." and support line "Audit gratuit · Honoraires au résultat". Right: compact colored isometric story showing an invoice with one coral duplicate row, a green audit scan, supplier and client buildings, and a euro-return arrow ending in a green check. Include the exact callout "ANOMALIE IDENTIFIÉE" and illustrative value "+ 12 650 €". Keep all content inside the 6% safe zone and add a thin current-green perimeter keyline.

### A06 - Hero audit-to-recovery system

**Where:** Homepage hero.

**Desktop file:** `A06-hero-audit-desktop-fr.png`, `1600x1200`, 4:3.

**Mobile file:** `A06-hero-audit-mobile-fr.png`, `1080x1350`, 4:5.

**Bucket:** A, French text-bearing.

**Desktop prompt**

> [STYLE PREFIX] [COMPREHENSION BLOCK] Create one coherent colored isometric enterprise scene on warm white. Show a client building, energy invoice with one coral duplicated row, green audit scan and "FACTURÉ / CORRECT" comparison, supplier building, and a large euro arrow returning to the client. Exact callouts: "1 · FACTURE REÇUE", "2 · ANOMALIE IDENTIFIÉE", "3 · RÉCLAMATION TRAITÉE", "4 · MONTANT RÉCUPÉRÉ"; exact result "+ 12 650 €". Add the reassurance row "Audit gratuit · Honoraires au résultat · Jusqu'à 5 ans analysés". Keep all content inside the central 84% x 82% safe zone, 1600x1200.

**Mobile prompt**

> [STYLE PREFIX] [COMPREHENSION BLOCK] Recompose the same exact four-stage story vertically for mobile. Use the same French labels, colors, buildings, invoice anomaly, comparison panel, euro return and "+ 12 650 €" outcome. Maintain a clear top-to-bottom reading order, central 88% safe width and large mobile-readable type, 1080x1350.

**Alt text**

`Schéma SaveWatt reliant factures d'énergie, anomalies détectées, sommes récupérées et contrat optimisé.`

**Embedded French annotations**

```text
Votre facture
Anomalie détectée
Réclamation au fournisseur
Montant récupéré
```

Each label is embedded beside its corresponding object with a short green
leader line. Repeat the full story in the French alt text.

### A07 - Billing anomaly atlas

**Where:** `Le constat`.

**Desktop:** `1200x1200`.

**Mobile:** `1080x1080`.

**French labels**

```text
ERREUR DE FACTURATION
PUISSANCE INADAPTÉE
TAXES & TURPE
CONTRAT OBSOLÈTE
```

**Prompt**

> [STYLE PREFIX] [COMPREHENSION BLOCK] Create four colored isometric before/correction diagrams in a strict two-by-two grid. Embed the exact titles "ERREUR DE FACTURATION", "PUISSANCE INADAPTÉE", "TAXES & TURPE" and "CONTRAT OBSOLÈTE". Use coral for each exact error and current green for the correction. Warm-white canvas, pale dividers, 10% outer margin and 6% gutters.

**Fallback**

Generate without labels and overlay the four French labels as HTML.

### A08a-f - Service glyph family

**Format:** six `512x512` warm-white PNG masters, displayed at full card width.

**Shared rule:** identical artboard, colored isometric scene, embedded French
title and one visible green outcome.

**A08a - Audit complet**

> [STYLE PREFIX] One colored isometric invoice with a green scan frame and one coral duplicate row. Exact title "AUDIT COMPLET"; exact line "Anomalie détectée".

**A08b - Récupération**

> [STYLE PREFIX] Colored isometric supplier and client buildings connected by a large green euro-return arrow and check. Exact title "RÉCUPÉRATION"; exact line "Montant rendu au client".

**A08c - Puissance souscrite**

> [STYLE PREFIX] Colored isometric building and contract panel with bars "SOUSCRITE" and "UTILISÉE"; mark excess amber and the correct lower level green. Exact title "PUISSANCE SOUSCRITE"; line "Niveau ajusté".

**A08d - Contrats**

> [STYLE PREFIX] Colored isometric old and optimized contracts with coral high cost and green lower cost. Exact title "OPTIMISATION DES CONTRATS"; line "Offre mieux adaptée".

**A08e - CEE**

> [STYLE PREFIX] Colored isometric building before/after an efficiency improvement, connected to a validated certificate. Exact title "CERTIFICATS CEE"; line "Aides valorisées".

**A08f - Suivi continu**

> [STYLE PREFIX] Three colored monthly invoice sheets M1, M2 and M3 with the same row checked in green. Exact title "SUIVI CONTINU"; line "Contrôle mois après mois".

### A09 - Four-step process flow

**Desktop:** `A09-process-flow-desktop-fr.png`, `1800x900`, 2:1.

**Mobile:** `A09-process-flow-mobile-fr.png`, `1080x1440`, 3:4.

**French labels**

```text
1 · TRANSMISSION
2 · AUDIT
3 · RÉCUPÉRATION
4 · OPTIMISATION
```

**Desktop prompt**

> [STYLE PREFIX] [COMPREHENSION BLOCK] Create four horizontal colored isometric stations joined by a directed green route. Embed titles "TRANSMISSION", "AUDIT", "RÉCUPÉRATION" and "OPTIMISATION" with the approved short French explanatory lines. Warm-white canvas, 8% horizontal and 12% vertical safe margin, 1800x900.

**Mobile prompt**

> [STYLE PREFIX] [COMPREHENSION BLOCK] Stack the same four colored stations vertically with identical French labels and a single downward green route. Use a central 88% width, generous spacing and mobile-readable type, 1080x1440.

### A10a-c - Sector glyphs

**Format:** three `512x512` warm-white PNG masters, displayed at full card width.

**A10a - Collectivités**

> [STYLE PREFIX] Colored isometric mairie, school, sports hall and streetlights converging into one checked analysis panel. Exact title "COLLECTIVITÉS"; line "Bâtiments publics analysés ensemble".

**A10b - Multi-sites**

> [STYLE PREFIX] Colored isometric office, retail and logistics sites converging into one consolidated analysis panel. Exact title "ENTREPRISES MULTI-SITES"; line "Toutes vos factures consolidées".

**A10c - Industrie et logistique**

> [STYLE PREFIX] Colored isometric factory, warehouse, loading bays and energy analysis panels showing an optimized contract. Exact title "INDUSTRIE & LOGISTIQUE"; line "Puissance et contrats optimisés".

### A11 - Recovery ledger

**Where:** `Pourquoi SaveWatt`.

**Desktop:** `1000x1200`, 5:6.

**Mobile:** optional `900x1080`, 5:6.

**Prompt**

> [STYLE PREFIX] Portrait colored isometric traceability scene: invoice with coral anomaly, "FACTURÉ / CORRECT" analysis, supplier, client and green euro return. Embed "ANOMALIE CONFIRMÉE", "RAPPORT DOCUMENTÉ", "MONTANT RÉCUPÉRÉ" and the checked lines "Source", "Calcul", "Résultat". Warm-white canvas, 12% margin, 1000x1200.

### A12 - Results verification glyph

> [STYLE PREFIX] Colored isometric source invoice, verification panel and result report joined by one green trace. Exact title "RÉSULTAT VÉRIFIÉ"; line "De la facture au gain documenté". Warm-white square canvas.

### A13 - FAQ marker

**Spec:** implement as a `24x24` CSS component. No generated image required.

### A14 - Final CTA trace

**Desktop:** `1800x360`, 5:1.

**Mobile:** `1080x720`, 3:2.

**Desktop prompt**

> [STYLE PREFIX] Ultra-wide warm-white colored isometric sequence: recent invoice, green audit scan and client building with recovered-value check. Exact callouts "UNE FACTURE RÉCENTE", "PRÉ-DIAGNOSTIC GRATUIT" and "POTENTIEL IDENTIFIÉ". Keep 6% horizontal safe margins, 1800x360.

**Mobile prompt**

> [STYLE PREFIX] Compact 3:2 warm-white colored isometric sequence: recent invoice, audit scan and client building joined by a green euro route. Exact callouts "UNE FACTURE RÉCENTE", "AUDIT GRATUIT" and "POTENTIEL IDENTIFIÉ". Keep 9% safe margins, 1080x720.

### A15 - Contact document upload illustration

**Desktop:** `1200x1000`, 6:5.

**Mobile:** `1080x1080`, 1:1.

**Prompt**

> [STYLE PREFIX] Colored isometric secure-submission scene: recent invoice, pale-blue secure transfer boundary and SaveWatt analysis panel joined by a green arrow. Exact callouts "FACTURE RÉCENTE", "ENVOI SÉCURISÉ", "DOCUMENT REÇU" and line "PDF ou image · 10 Mo maximum". Warm-white canvas, no readable private data, generous safe margins.

### A16 - Sector OG template

**Format:** `1200x630`.

**French text variables**

```text
SaveWatt
[TITRE DU SECTEUR]
Audit · Récupération · Optimisation
```

Create via dynamic OG rendering where possible so French titles remain real text.

---

## 15. ACCESSIBILITY & CONTENT SAFETY

- Generated text must never carry the only instance of important information.
- Every image gets French alt text.
- Decorative assets use empty alt text.
- Current green is never the sole signal; use shape, icon, or label too.
- Text on current green is deep green, not white.
- Minimum touch target: `44x44px`.
- All motion has a reduced-motion fallback.
- Financial examples are visibly labeled `Exemples illustratifs`.
- Do not publish `8 factures sur 10`, `30 %`, or similar category claims without an approved source or an explicit illustrative qualifier.

---

## 16. ASSET PRODUCTION WORKFLOW

1. Generate the French master at the exact source size.
2. Check safe-zone compliance before aesthetic review.
3. Check accent hex using a color picker.
4. Reject any artwork with English production text.
5. Reject any cropped invoice, process node, or validation result.
6. Keep the approved PNG master, then export AVIF with WebP fallback.
7. Create mobile composition separately.
8. Add French alt text in the implementation.
9. Record model, prompt version, seed/job ID, and approval status.

---

## 17. QUALITY GATE

### Visual

- [ ] Structural colors match the palette
- [ ] Current green is `#B9F43A`
- [ ] Accent is used only for signal/validation/recovery
- [ ] Line weight is consistent
- [ ] Composition follows the intended aspect ratio
- [ ] Critical content stays inside the safe zone
- [ ] No unintended crop at desktop or mobile
- [ ] No stock-photo or generic eco imagery

### Language

- [ ] All production text is French
- [ ] Accents and punctuation are correct
- [ ] No hallucinated labels
- [ ] Text remains legible at rendered size
- [ ] English is limited to planning review documents

### Responsive

- [ ] Desktop and mobile masters both exist where required
- [ ] Mobile is recomposed rather than cropped
- [ ] Labels are large enough for mobile
- [ ] `<picture>` dimensions prevent layout shift

### Brand

- [ ] The visual communicates audit, trace, recovery, or optimization
- [ ] SaveWatt does not resemble an energy supplier
- [ ] No fake proof, logos, people, or performance data
- [ ] The result feels technical, editorial, and French-market appropriate
