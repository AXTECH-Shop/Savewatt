# Savewatt Platform — Status & Task Plan

_Last updated: 2026-09-25_

## Implementation update — 2026-09-25 (deployed)

- **OCR moved to Vertex AI (EU)**: `gemini-3.6-flash` on `aiplatform.eu.rep.googleapis.com`, billed to GCP project `project-f5aa049c-0f7c-40c8-bf5`. Keyless auth via Workload Identity Federation (pool `savewatt-workers`, provider `savewatt-platform`, direct principal with `roles/aiplatform.user`); the Worker signs its own OIDC JWT with the `GCP_WIF_PRIVATE_KEY` secret (`src/lib/extraction/google-auth.ts`). The Gemini API key path is gone. Verified on 5 real bills (EDF ×2, ENGIE ×2, TotalEnergies).
- **Email moved to Cloudflare Email Service** (`send_email` binding `EMAIL`, sender `offres@savewatt.fr`); Resend sender, webhook, and Svix verifier removed. No provider delivery callbacks yet — delivery rows stay `SENT`.
- **R2** bucket `savewatt-documents` created in the EU jurisdiction; D1 migrations through 0015 applied remotely; app deployed to `app.savewatt.fr`.
- **Live proof** (`tmp/pdf-analysis/run-bill-to-offer.mjs`): Vertex extraction of the EDF bill → validated extraction → Symphonics terms → offer v1 (10 €/MWh) → 17 561 € TTC/an, 2 238 €/an savings → both PDFs.
- **Delivery callbacks**: Email Service lifecycle events (queue `savewatt-email-events`, subscription on savewatt.fr) are consumed by the custom Worker entry `worker.ts` → `src/lib/offers/offer-delivery-events.ts`. Sending only records the delivery as `QUEUED`; the offer version becomes `SENT` and the dossier `sent` when `message.delivered` arrives; bounces/failures/rejections mark the delivery and write a timeline event.
- **Internal admins**: `julia@savewatt.fr` and `gary.abitbol@gmail.com` whitelisted as `SUPER_ADMIN` (org `org_savewatt`) in remote + local D1; matching Clerk **production** users created with temporary passwords (kept outside the repo). They sign in on `admin.savewatt.fr` once the cutover below is live.
- **Clerk production** instance created for `savewatt.fr` (Google sign-in disabled until custom OAuth credentials exist). Clerk CNAMEs added (DNS + mail complete); SSL still provisioning. Once SSL is complete, copy `.env.clerk-production` → `.env.production.local`, put `CLERK_SECRET_KEY`/`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` Worker secrets, rebuild and deploy.
- **DocuSeal** kept in the codebase but inactive (no secrets configured).

## Implementation update — 2026-09-25

**Production is live** (worker `79a7cc19-d8b6-44e5-90e8-4b3132850927` at app.savewatt.fr) and transactional email is dual-driver:

- **Deployed to Cloudflare**: remote D1 migrated to `0015` (0005–0014 had never been applied remotely — schema drift fixed), R2 bucket `savewatt-documents` (EU), random `CRON_SECRET` / `PORTAL_TOKEN_SECRET` secrets set. Smoke checks pass: API auth walls 401, portal invalid-link page 200, cron endpoint answers its own Bearer auth.
- **Cloudflare Email Service**: `send_email` binding `EMAIL` configured (unrestricted, `remote: true` for local dev). New dual-driver sender `src/lib/email/transactional-email.ts`: prefers the EMAIL binding, falls back to Resend when `RESEND_API_KEY` is set, explicit no-op skip when neither exists, no cross-driver retry (no double-send risk). Attachments (both offer PDFs) are supported by the binding per `@cloudflare/workers-types` `EmailAttachment`. Offer delivery and the follow-up sweep both route through it.
- **Webhook auth fix**: `/api/webhooks/resend` and `/api/cron/followups` bypass Clerk (they authenticate themselves via svix signature / Bearer CRON_SECRET) — verified live: Resend webhook returns 503 `WEBHOOK_NOT_CONFIGURED` until `RESEND_WEBHOOK_SECRET` is provided, cron returns 401 `UNAUTHORIZED` from the route itself. Restored the Resend webhook route with svix verification (`verifyResend`) and delivery-state mapping.
- **Known limitation**: signed-out page requests 404 (`x-clerk-auth-reason: protect-rewrite, dev-browser-missing`) because the deployment still uses Clerk **development** keys — a Clerk production instance (`pk_live`/`sk_live`, domain `app.savewatt.fr` authorized) is required; client bundle must be rebuilt with the live publishable key.
- **Prerequisites remaining with the user**: onboard `savewatt.fr` in Cloudflare Email Service (dashboard → Compute → Email Service → Email Sending → Onboard Domain; adds MX/SPF/DKIM/DMARC), Clerk production keys, Resend keys (only if the Resend fallback/driver is wanted), Gemini billing top-up (extraction API currently 402).
- Tests: 61 lib tests green (email driver selection, capability rule, no-driver skip, no-double-send), i18n parity green, lint clean, production build green.

## Implementation update — 2026-09-23

The offer engine now reproduces the **Symphonics budget prévisionnel** exactly (validated to the euro against the real Josh / AX TECH proposal) and delivers **two PDFs** per offer — a technical budget document and a marketing one-pager:

- **Pricing model spec**: `specs/symphonics-pricing-model.md` documents the deduced formula, the worked reconciliation (engine output matches Symphonics' 16 812 € TTC line-by-line), the full variable inventory with admin/régie/customer visibility, and the contract mechanics (Art. 5.5 ±20 % tolerance band, Art. 9.3.1.3 termination indemnity, 5 000 € deposit, TURPE pass-through).
- **Configurable pricing parameters** (migration `0014`; applied remotely 2026-09-24): versioned, org-scoped `pricing_parameters` (CEE, capacity, accise, CTA, TVA, TURPE fixed + per-cadran variable rates) seeded with the validated constants; `margin_grids` gain a `role_scope` (ADMIN/REGIE, régie max capped by the admin grid, repository-enforced); `offer_versions` gain `budget_json` plus `pdf_marketing_r2_key`/`pdf_marketing_sha256`.
- **Estimate engine** (`src/lib/offers/estimate.ts`, pure): `computeBudgetPrevisionnel` produces the full budget breakdown (énergie, abonnement, CEE, capacité, acheminement fixe/variable, accise, CTA, HT, TVA, TTC) and `deriveAnnualCadranVolumes` annualizes partial extractions with the validated seasonal split. `createOfferVersion` stores the customer-safe budget snapshot on every new version.
- **Régie secrecy by construction**: `offer-visibility.ts` strips électron buy price, CEE/capacity components, margin, and grid bounds from every API response for non-operator roles (offer versions, supplier offer, margin grids; régie roles get 403 on grid/pricing internals). Operator-only APIs: `GET/POST /api/crm/pricing-parameters`; margin grids accept `role_scope`.
- **Dual PDFs**: `renderOfferBudgetHtml` (Symphonics-style technical budget) and `renderOfferMarketingHtml` (savings hero, benefits, simplified comparison, TTC summary, CTA) rendered through the `BROWSER` binding, both archived in R2 with SHA-256 each, both attached to the Resend delivery email (marketing first). `GET /api/crm/offer-versions/[id]/pdf?kind=marketing` serves the marketing PDF; versions predating 0014 recompute the budget server-side from their immutable snapshot.
- **Settings UI now writable for the operator**: `/settings/margins` edits ADMIN + REGIE margin grids, new `/settings/pricing` edits the pass-through rates and TURPE grid (each save = new version); both entries hidden from régie roles.
- **End-to-end replay (local)**: real Josh dossier (PDL 50066947359734, Courtry) seeded into local D1 with a validated EDF extraction and the Symphonics supplier terms; v1 (margin 0) reconciles to 16 812 € TTC exactly, v2 (default 10 €/MWh margin) yields 17 561 € TTC/an and 2 238 €/an savings. Artifacts in `tmp/pdf-analysis/output/` (HTML + PDF + PNG).
- Tests: 46 lib tests green (budget reconciliation replay, forecast helper, régie serializer, dual-template secrecy), i18n parity green, lint clean, production build green.

### Still demo / pending (see GitHub issues)

- Signature screen UI still reads the localStorage dossier for display; the DocuSeal webhook remains authoritative in D1 (issue #15 covers the clean template + full rebinding).
- Public token portal `/portal/offer/[token]` remains hard-coded (issue #14).
- Commission persistence, finance close, back-office transmission: unchanged (issues #16–#18).
- Migrations through `0015` are applied remotely; deploy completed 2026-09-25 (see update above).
- Resend key/domain activation still pending (delivery path unchanged otherwise).

## Implementation update — 2026-09-22

The primary admin workflow **import → offer → send** is now durable end-to-end (no `localStorage` in the journey):

- **Leads**: new `/leads` UI (list, filter, create, convert) plus Excel bulk import. Downloadable template at `/templates/modele-import-prospects.xlsx` (generated by `scripts/generate-lead-template.mjs`). `POST /api/crm/leads/import` validates per row, dedups against scoped leads/clients by SIREN/email/phone, records an idempotent `lead_imports` run, and returns a row-by-row report.
- **Extraction**: `extractions` table + scoped APIs. The dossier documents panel runs analysis on BILL/CURRENT_CONTRACT documents (`POST /api/crm/documents/[id]/extract`, R2 bytes → Gemini → persisted row), and the validation screen saves human-reviewed fields to D1 (`PUT /api/crm/extractions/[id]`) before advancing the dossier to `analyzed`.
- **Supplier offer**: `supplier_offers` + lines persisted via `POST /api/crm/dossiers/[id]/supplier-offer` (upsert). The form no longer writes `localStorage` in connected mode.
- **Margin grids**: versioned `margin_grids` (min/default/max, effective dates). Resolution is server-side only; creation restricted to SUPER_ADMIN / master admins (`POST /api/organizations/[id]/margin-grids`). Overrides within bounds require a reason; outside bounds the offer version is created as `APPROVAL_REQUIRED` and cannot be sent until approved.
- **Immutable offer versions**: `offer_versions` snapshot the validated current contract, supplier offer, applied margin, comparator result, and client price lines, with a canonical SHA-256. `POST /api/crm/dossiers/[id]/offer-versions` creates v1/v2+; sent versions are never mutated. Creating a version advances the dossier `analyzed → proposalReady`.
- **Server PDF**: customer-safe A4 HTML rendered through the Cloudflare Browser Rendering binding (`BROWSER`), archived privately in R2 with SHA-256, recorded on the offer version. The template context only ever receives final client prices — buy price, CEE/capacity split, margin, and internal notes never reach it (secrecy by construction, covered by a test).
- **Email delivery**: Resend (`RESEND_API_KEY`) sends the branded PDF attached to the client contact (`POST /api/crm/offer-versions/[id]/send`), records `offer_deliveries` with idempotency keys, marks the version `SENT`, advances the dossier `proposalReady → sent`, and writes the timeline event. PDF download via `GET /api/crm/offer-versions/[id]/pdf` (authenticated, private).
- Dossier state machine extended: `proposalReady → sent`.
- New tests: lead import parser (5), offer engine (6) — comparator-with-margin, snapshot hash stability/secrecy of the PDF context. 34 lib tests green, i18n parity green, lint clean.

### Still demo / pending (see GitHub issues)

- Signature screen UI still reads the localStorage dossier for display; the DocuSeal webhook remains authoritative in D1 (issue #15 covers the clean template + full rebinding).
- Public token portal `/portal/offer/[token]` remains hard-coded (issue #14).
- Commission persistence, finance close, back-office transmission, writable settings: unchanged (issues #16–#19).

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
| C1 | **OCR/extraction = Google Gemini 3.6 Flash (DECIDED)** | Via the Gemini Developer API with a restricted Cloudflare Worker `GOOGLE_API_KEY` secret. The project requires active Gemini API billing credits. Record model/config in `specs/ai-services.md`. |
| C2 | **Extraction pipeline (BACKEND BUILT · PROVIDER-AGNOSTIC)** | Canonical unit-aware schema `src/lib/extraction/schema.ts` (works across EDF/TotalEnergies/Engie/… — captures raw printed value **+ unit** and normalizes prices→€/MWh and abonnement→€/month; unified PDL/PRM; BASE/HP-HC/4-cadran/Tempo/EJP). Gemini API-key client `gemini.ts` with a synonym-mapping, all-suppliers prompt + strict JSON + confidence + warnings; deterministic `normalize.ts` safety net; `POST /api/extract` (auth-gated, PDF/img, 10 MB). **TODO:** human validation split-view UI + feed the comparator; test against JOSH (EDF), totalbill (TotalEnergies) + an Engie bill. |
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
- **OCR:** provider decided = Gemini 3.6 Flash through the Gemini API. The restricted `GOOGLE_API_KEY` is configured locally and as a Worker secret; add Gemini API prepayment credits before live extraction. Confirm supplier priority (EDF confirmed via JOSH).
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
