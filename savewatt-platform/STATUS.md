# Savewatt Platform — Status & Task Plan

_Last updated: 2026-09-16_

## Implementation update — 2026-09-16

The platform shell is now role-scoped and production-build clean:

- Branded Clerk sign-in/sign-up routes are separated from the authenticated app shell.
- Server-gated workspaces exist for operator, finance, master/sub-régie, back-office, team manager, apporteur/read-only, and client roles.
- The workflow, margin, commission, template, branding, and active-session settings screens exist with honest disabled states where persistence is not yet available.
- Bill validation now has the specified split-view field editor and saves validated contract data into the current demo repository.
- Manual supplier-offer intake supports per-cadran energy prices, CEE, capacity, subscription, duration, validity, volumes, and margin; CSV remains an intentionally disabled connector seam.
- DocuSeal submission creation is authenticated, bound to the dossier with `external_id`, requires email 2FA, and embeds the per-signer form. Browser completion is only a pending UI signal; timestamped HMAC webhooks write authoritative completion to D1.
- The commission engine enforces the locked 66% network pool, 50/50 AX TECH/master split, bounded cascade, caps/primes/clawbacks, and integer-cent accounting with automated tests.
- The customer-facing offer includes the AX TECH legal footer and the public token portal never exposes buy price or margin.
- Cloudflare D1 is selected and live in Western Europe. The initial schema covers the materialized organization tree, users, clients, sites, dossiers, documents, signatures, commissions, wallets, Giftogram redemptions, integration events, and audit events.
- Giftogram is the selected gifting provider. The server-only connector uses campaign orders, provider `external_id` idempotency, atomic wallet reservations, failure rollbacks, and HMAC-verified webhook intake. Issuance remains disabled until sandbox credentials are supplied.
- DocuSeal webhook verification now uses the provider’s timestamped HMAC signature and writes authoritative completion to D1. The supplied PDF was not uploaded because it is an already signed customer contract containing personal and commercial data; a clean master is required.

Verified locally with Node 22: ESLint, Next.js production build, commission tests, production dependency audit, and browser checks of auth, mobile operator, dossier, extraction validation, supplier intake, settings, and customer portal.

## What this platform is (post-pivot)

An **internal-efficiency tool** for the SaveWatt (AX TECH) commercial operation.
A network of **régies / apporteurs** (business introducers) sells **Symphonics**
electricity to business clients. The platform captures the client's current bill,
compares it to a Symphonics proposal + margin, produces a **branded offer**, gets
it **e-signed (DocuSeal)**, and tracks the **commission cascade** that pays the
network — with earnings redeemable as **gift cards through Giftogram**.

**Symphonics has no API yet.** For the first ~100 deals we build the offer
**manually** from a Symphonics price sheet. The platform's job right now is to make
that manual process fast, consistent, branded and auditable — not to automate
Symphonics. See `docs/offer-workflow.md` for the real offer-creation workflow.

**Three dashboards** (one product, role-scoped):
1. **SaveWatt team** (internal / operator) — all régies, all deals, reconciliation, commissions owed.
2. **Régie / commercial partners** — their own branch: sub-accounts, deals, commissions to receive/pay, team ranking.
3. **Customers** — track their own bill(s), offer, signature status, savings.

**Deploy target: Cloudflare** — Pages/Workers + D1 or Postgres-via-Hyperdrive +
R2 (files) + Workers (API, OCR, PDF, webhooks). See _Architecture decisions_ below.

---

## ✅ Done (working & verified in-browser)

| Area | What works |
|---|---|
| App scaffold | Next.js 16 (App Router) + TypeScript + Tailwind v4 + Geist |
| i18n | `next-intl` FR (default) / EN, URL-prefixed (`/fr`, `/en`), sidebar switcher, FR/EN number & date formatting |
| Design system | Zinc base + deep-emerald accent, buttons/cards/fields/badges, tactile press, empty/loading states, mobile-responsive shell |
| Dashboard | Client-file list, KPIs (active / signed / annual savings), empty state, **sample loader** (JOSH case) |
| New proposal | Client form (name, SIREN, contact, signer email, PDL 14-digit, segment) + **drag-drop PDF upload** (bill + contract) with validation |
| Current contract card | Supplier, offer, end date + countdown, **tacit-renewal flag**, standing charge, annual consumption, per-cadran price table |
| Comparator | Per-cadran current vs proposed (à périmètre identique), delta €/MWh, gain/yr, **hidden margin slider**, annual + term savings |
| Alerts | Winter-band-missing, HC>HP, offer-expiring-<48h |
| Proposal document | Client-facing, **final prices only** (no buy price / no margin), savings headline, print/PDF |
| Signature | Signature route + status page + signed state; **mock mode** when unconfigured (to be repointed at DocuSeal) |
| Persistence | Browser demo store plus a live Cloudflare D1 schema and server repositories for integrations |
| Acceptance fixture | JOSH §7.4 reproduces **€2,511/yr** (HPE €2,354 + HCE €7 + €150 standing charge) and all 3 alerts |

---

## 🎯 Now — Phase 1.5: branding, UX, real signing, extraction, partner accounts

Ordered by dependency. Each row is a shippable unit.

### A. Brand the platform like the landing page
| # | Task | Detail |
|---|---|---|
| A1 | **Reuse the SaveWatt logo & wordmark** | Replace the placeholder lightning `BrandMark`/`BrandLockup` in `src/components/brand.tsx` with the real logo (`public/assets/generated-v3/A01-*` — favicon-48 / app-512). Copy the asset(s) into `savewatt-platform/public/brand/`. Wordmark: "Save**Watt**" with the accent on "Watt". |
| A2 | **Align design tokens to the brand** | Landing uses Fraunces (display) + Outfit (sans) + IBM Plex Mono (figures) and the emerald/deep-green palette (`--deep #052c24`, `--brand-green #118a34`). Platform currently uses Geist + `--color-accent #0e7a4f`. Reconcile: keep Outfit/IBM Plex Mono for a data-dense B2B UI, adopt the brand greens, keep Fraunces only for marketing-style headers if used. Document final tokens in `specs/design-system.md`. |
| A3 | **Very good UX pass** | Apply a taste skill (recommended: `design-taste-frontend` for the app shell / data-dense screens; `high-end-visual-design` for marketing-facing surfaces). Focus: sidebar/nav, dashboard density, empty/loading/error states, one-handed mobile for apporteurs, tabular-num money everywhere, tactile feedback. |
| A4 | **Branded PDF** | Offer/contract PDFs carry the SaveWatt logo, brand colors, footer with AX TECH legal identifiers (SIREN 751 982 760, TVA FR86 751 982 760, 8 rue Marbeau 75016 Paris). See P5 for the rendering engine. |

### B. Real e-signature (DocuSeal)
| # | Task | Detail |
|---|---|---|
| B1 | **Wire real DocuSeal** | Use the installed `docuseal-code` skill. Real account/instance + a contract template; embedded in-app signing. Decide **cloud vs self-hosted** (self-host is EU-friendly). |
| B2 | **Signature webhook** | `submission.completed` → flip dossier to **Signed** automatically; archive the signed PDF + audit trail to R2 (10-year retention). |
| B3 | **Branded signing** | Template uses the branded offer/contract PDF (A4). |

### C. Backend OCR / bill extraction (evaluate + integrate)
| # | Task | Detail |
|---|---|---|
| C1 | **OCR/extraction = Google Gemini 3 Flash (DECIDED)** | Via Google Agent Platform, **ADC only — no API keys** (org policy). Auth already done via `gcloud auth login`. Record model/config in `specs/ai-services.md`. |
| C2 | **Extraction pipeline (BACKEND BUILT · PROVIDER-AGNOSTIC)** | Canonical unit-aware schema `src/lib/extraction/schema.ts` (works across EDF/TotalEnergies/Engie/… — captures raw printed value **+ unit** and normalizes prices→€/MWh and abonnement→€/month; unified PDL/PRM; BASE/HP-HC/4-cadran/Tempo/EJP). Gemini ADC client `gemini.ts` with a synonym-mapping, all-suppliers prompt + strict JSON + confidence + warnings; deterministic `normalize.ts` safety net; `POST /api/extract` (auth-gated, PDF/img, 10 MB). **TODO:** human validation split-view UI + feed the comparator; test against JOSH (EDF), totalbill (TotalEnergies) + an Engie bill; move off Node runtime for Cloudflare. |
| C3 | **Replace manual figures** | Extraction feeds the current-contract card and comparator instead of the sample/manual entry (see D2 for the manual fallback). |

### D. Manual offer builder (no Symphonics API)
| # | Task | Detail |
|---|---|---|
| D1 | **Symphonics price-sheet intake** | Rep enters/imports the Symphonics proposal manually (per-cadran electron €/MWh, abonnement, CEE €/MWh, capacity €/MWh, prévisionnel volumes, validity date). CSV import stub now → API later (connector seam). |
| D2 | **Editable current contract + proposal** | Reps can enter/correct figures for **any** client (not just JOSH): supplier, offer, cadran prices, subscription, proposed prices, margin. Validation + bounds. |
| D3 | **Persist real uploaded files** | Store the actual PDF bytes in **R2** (not just name/size). |
| D4 | **Server-side branded PDF (P5)** | HTML→PDF at the master charte. On Cloudflare use **Browser Rendering (Puppeteer binding)** — plain Playwright doesn't run on Workers. Alt: a small render service. |

### E. Auth, accounts & the partner (MLM) hierarchy
| # | Task | Detail |
|---|---|---|
| E1 | **Auth = Clerk (BASE WIRED + HARDENED)** | `@clerk/nextjs` Core 3; `clerkMiddleware` composed with next-intl in `src/proxy.ts`; **all routes protected** via `auth.protect()` (public: sign-in/up only); `ClerkProvider` with **French/English localization** by locale; sign-in/up pages under `[locale]`; `Show`/`UserButton` in the shell; **userId/orgId mapping** in `src/lib/auth-context.ts` (Clerk orgId → régie `organizations.id`, orgRole → RBAC). **TODO:** map Clerk orgs to the real org tree once DB lands; configure production instance. |
| E2 | **Org hierarchy / sub-accounts** | Materialized-path tree: OPERATOR → MASTER (régie) → SUB_REGIE (n levels) → TEAM → APPORTEUR. A régie can **add partners/sub-accounts under itself** (self-serve, within limits its parent sets). One master never sees another; a partner sees only its own branch. |
| E3 | **Roles & scoping** | RBAC per `specs/rights-matrix.md`. Isolation is enforced in the query layer (+ RLS if we use Postgres — see Architecture). Impersonation (banner + reason + audit) for operator/master on their branch. |
| E4 | **Commission engine (MLM payout)** | Locked math: Symphonics → network **66% of margin M** (Symphonics keeps 34%); first split **50% AX TECH / 50% master régie**; master's share **cascades** down sub-régie → team → apporteur via **configurable grids** (€/MWh, %, signing prime, cap, clawback). Earnings accrue as **credits/commission lines** per contract. |
| E5 | **Giftogram redemption (BACKEND BUILT · CREDENTIALS PENDING)** | Authenticated redemption route, D1 wallet reservation, `external_id` idempotency, automatic credit release on provider failure, and HMAC webhook inbox are implemented. Remaining: sandbox API key, campaign ID, webhook client secret, and finalized vesting/tax policy. |

---

## 🧭 Later — path to production (from `../specs`)

| # | Task | Spec |
|---|---|---|
| Q1 | Move remaining screen repositories from localStorage to the live Cloudflare D1 schema | `specs/backend-specs.md`, `specs/rights-matrix.md` |
| Q2 | Full workflow engine, back-office validation queue, **échéancier** (renewal alerts J-180/90/30) | Lots 4 & 7 |
| Q3 | Monthly close + reconciliation + **Factur-X** consolidated invoicing to Symphonics | Lot 6 |
| Q4 | Symphonics **connector** upgrade (CSV import → real API when available) | Lot 5 |
| Q5 | Observability, security hardening, pentest, backups/PRA | Lot 7 |
| Q6 | INSEE Sirene autocomplete, regulatory params (accise/CTA/TVA/TURPE) versioned | Lots 2–3 |

---

## 🏗️ Architecture decisions — Cloudflare stack (to confirm)

| Layer | Proposal | Note / open question |
|---|---|---|
| Hosting | Next.js 16 on Cloudflare via **OpenNext (`@opennextjs/cloudflare`)** or Pages | Confirm OpenNext works with Next 16 App Router + next-intl. |
| **Database** | **Cloudflare D1 (DECIDED · CREATED · MIGRATED):** native SQLite with a materialized-path organization tree. | Tenant isolation must be enforced in every repository query because D1 has no PostgreSQL-style RLS. Financial mutations use integer cents, immutable ledgers, unique source keys, and provider idempotency. |
| Files | **R2** for bill uploads, generated offers/contracts, signed docs | Signed-URL access; EU jurisdiction. |
| Background / API | **Workers** (+ Queues/Cron) for OCR calls, PDF render, DocuSeal webhooks, monthly close | Long OCR/PDF jobs → Queues; Cron for échéancier + monthly close. |
| PDF rendering | **Cloudflare Browser Rendering** (Puppeteer binding) | Plain Playwright won't run on Workers. |
| Secrets | Workers secrets / a vault binding | KMS-style envelope encryption for IBAN/ID/RIB. |

---

## ⚠️ Known limitations (demo today)

- Existing demo screens still read `localStorage`; the durable D1 schema exists, but those UI repositories have not all been migrated yet.
- Uploaded PDFs recorded by name/size only (bytes not stored) — fixed by D3.
- Real DocuSeal code is wired, but production signing remains inactive until a sanitized template is uploaded and secrets are configured.
- Brand is placeholder (generic lightning mark) until A1–A2.
- Margin base fixed to electron+CEE+capacity default (OQ2 — confirm before billing).

## ❓ Open questions to unblock

- **DocuSeal:** confirm EU Cloud vs self-hosted and provide the unsigned/blank Symphonics master. The current PDF is a completed contract and cannot safely become a reusable template.
- **OCR:** ~~provider~~ decided = Gemini 3 Flash (ADC). Local dev needs `gcloud auth application-default login` (ADC ≠ `gcloud auth login`). Confirm exact `GEMINI_MODEL` id + EU region for the endpoint; which suppliers' bills first (EDF confirmed via JOSH).
- **Auth:** ~~build vs buy~~ decided = Clerk. Remaining: how Clerk `userId`/`orgId` map to the in-app org tree + (if Postgres) RLS GUCs.
- **Giftogram:** sandbox API key, API campaign ID, webhook client secret, credit vesting rules, minimum redemption, and tax treatment.
- **Commission:** confirm downstream grid defaults per level (OQ3) and margin base (OQ2) before any real payout.
- **Symphonics manual offer:** confirm the exact price-sheet format reps will receive (drives D1). See `docs/offer-workflow.md`.

---

## Run the app

```bash
cd savewatt-platform
npm run dev
```

Open http://localhost:3000 → redirects to a locale. Walkthrough in `README.md`.
DocuSeal config (once wired) also in `README.md`.
