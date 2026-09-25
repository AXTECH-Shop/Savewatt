# Savewatt — Frontend Specifications (Screen List)

> Mandated pre-code deliverable #3. Screen-by-screen, mobile-first (apporteur) + desktop-dense (back-office/finance). Components from `design-system.md`; entities from `backend-specs.md`; routes referenced here must exist in `api-docs.md`. Access per `rights-matrix.md`.

## Conventions

- App shell: left nav (role-scoped), top bar (org switcher for multi-membership, impersonation banner, notifications, user menu). Route groups: `(auth)`, `(app)`, `(portal)` for CLIENT.
- Every list = reui data-grid with server pagination (cursor), filters, Excel export where permitted.
- Every mutation shows optimistic state + toast; async jobs (extraction, PDF, close) show progress via job status polling/subscription.

---

## A. Auth & onboarding

| # | Screen | Route | Key content | API |
|---|---|---|---|---|
| A1 | Login | `/login` | email+password, "new device" notice | `POST /auth/login` |
| A2 | MFA challenge | `/login/mfa` | TOTP / passkey / backup code | `POST /auth/mfa/verify` |
| A3 | MFA enrollment | `/onboarding/mfa` | TOTP QR + WebAuthn register, backup codes | `POST /auth/mfa/enroll` |
| A4 | Accept invitation | `/invite/[token]` | set password (HIBP check), enroll MFA | `POST /auth/invitations/accept` |
| A5 | Forgot / reset | `/reset`, `/reset/[token]` | identical-response messaging | `POST /auth/reset` |
| A6 | Active sessions | `/settings/sessions` | list, revoke | `GET/DELETE /me/sessions` |

## B. Apporteur (mobile-first) — the core selling flow

| # | Screen | Route | Key content | API |
|---|---|---|---|---|
| B1 | My pipeline | `/pipeline` | kanban by workflow stage + list toggle; filters (segment, échéance) | `GET /dossiers` |
| B2 | Create client | `/clients/new` | SIREN autocomplete (INSEE), headcount/CA, contacts | `GET /lookup/sirene`, `POST /clients` |
| B3 | Client detail | `/clients/[id]` | tabs: sites, current contracts, dossiers, offers, commissions | `GET /clients/{id}` |
| B4 | Add site | `/clients/[id]/sites/new` | PDL/PRM (14-digit check), segment, powers by cadran | `POST /sites` |
| B5 | Upload bill(s) | `/dossiers/[id]/bills` | multi-file drop, AV + OCR + extraction status | `POST /bills`, `GET /bills/{id}` |
| B6 | **Bill validation** | `/dossiers/[id]/bills/[bid]/validate` | split view PDF ↔ fields + confidence chips, highlight-to-source, edit low-confidence | `GET /bills/{id}/extraction`, `PATCH …/validate` |
| B7 | **Contrat actuel card** | (in B3/B6) | supplier, offer, end date + countdown, HP/HC €/MWh by season, last bill, reconstituted annual conso, power souscrite vs atteinte | `GET /sites/{id}/current-contract` |
| B8 | Request/import Symphonics offer | `/dossiers/[id]/supplier-offer` | CSV/Excel/PDF import (v1); shows offer fields | `POST /supplier-offers/import` |
| B9 | **Comparator** | `/dossiers/[id]/compare` | per-cadran table (actuel vs proposé, écart €/MWh, volume, gain €/an), annual + term savings HT/TTC, before/after chart, **alert set** | `POST /compare` |
| B10 | Build client offer | `/dossiers/[id]/offer` | margin per-cadran/global (bounded by grid → validation if out), power choice (impact €/an), validity ≤ supplier | `POST /client-offers` |
| B11 | Send to signature | `/dossiers/[id]/offer/[oid]/send` | signer(s), OTP channel, optional docs config, portal link | `POST /client-offers/{id}/send` |
| B12 | My commissions | `/commissions` | acquired / upcoming, per contract; **no parent margins** | `GET /commissions?scope=owned` |

**Alert set (B9, danger/warning banners):** missing cadran → "facture d'hiver requise"; HC proposé > HP; supplier offer expired / expiring < 48h; power atteinte = souscrite; reconduction tacite probable.
**Client-facing exports never show Symphonics buy price or margin.**

## C. Team manager

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| C1 | Team pipeline | `/team/pipeline` | all team dossiers, reassign within team | `GET /dossiers?scope=team`, `PATCH /dossiers/{id}/assign` |
| C2 | Team performance | `/team/performance` | apporteur ranking, conversion, commissions | `GET /reports/team` |

## D. Master / Sub-régie admin

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| D1 | Org tree | `/org` | tree of sub-régies/teams, create nodes | `GET /organizations`, `POST /organizations` |
| D2 | Users & roles | `/org/users` | invite, custom permission_sets, disable+reassign portfolio | `POST /invitations`, `PATCH /memberships` |
| D3 | Workflow editor | `/settings/workflows` | visual steps/conditions/required docs/SLAs/auto-actions; versioned | `GET/POST/PUT /workflows` |
| D4 | Margin grids | `/settings/margins` | min/max €/MWh by cadran/global, effective dates (≤ parent) | `GET/PUT /margin-grids` |
| D5 | Commission grids | `/settings/commissions` | per direct-child level: €/MWh, %, prime, cap, clawback | `GET/PUT /commission-grids` |
| D6 | Document templates | `/settings/templates` | offer/contract/SEPA/statement/invoice editors + variables | `GET/PUT /templates` |
| D7 | Branding | `/settings/branding` | logo, charte tokens, subdomain/custom domain | `PUT /organizations/{id}/branding` |
| D8 | Branch portfolio | `/portfolio` | contracts open/signing/active/expired; monthly billing by client; commissions to receive/pay; rankings | `GET /contracts`, `GET /reports/portfolio` |

## E. Master back-office

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| E1 | Validation queue | `/backoffice/queue` | dossiers awaiting doc check / internal validation | `GET /dossiers?stage=review` |
| E2 | Document check | `/backoffice/dossiers/[id]` | verify RIB/ID/KBIS/POA, signer = legal rep, readability | `PATCH /documents/{id}/verify` |
| E3 | Transmit to Symphonics | `/backoffice/dossiers/[id]/transmit` | build transmission package (v1 export + ack) | `POST /contracts/{id}/transmit` |

## F. Operator (AX TECH)

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| F1 | Operator dashboard | `/operator` | all masters, MWh under mgmt, active contracts, commission revenue (real/forecast), reconciliation anomalies, API/queue health | `GET /reports/operator` |
| F2 | Masters admin | `/operator/masters` | create master (identity, branding, workflow, grids, templates, first admin) | `POST /organizations` (type=MASTER) |
| F3 | Symphonics params | `/operator/symphonics` | connector config, CSV import mappings, pricing params | `PUT /suppliers/symphonics` |
| F4 | Regulatory params | `/operator/regulatory` | dated accise/CTA/TVA/TURPE | `GET/POST /regulatory-params` |
| F5 | Global audit log | `/operator/audit` | immutable log viewer, filters, export | `GET /audit-log` |
| F6 | Impersonation | (top bar action) | start/stop with motif, banner | `POST /impersonation` |

## G. Operator finance

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| G1 | Monthly close | `/finance/close` | run/relaunch close; period picker; step status | `POST /billing/close`, `GET /commission-runs/{id}` |
| G2 | Reconciliation | `/finance/reconciliation` | anomalies (volume diff / missing / unknown), resolve | `GET/PATCH /reconciliation-anomalies` |
| G3 | Symphonics invoices | `/finance/invoices` | consolidated Factur-X, continuous numbering, per-contract annex, status | `GET/POST /invoices` |
| G4 | Consumption import | `/finance/consumption` | upload Symphonics monthly CSV, preview, commit | `POST /consumption/import` |
| G5 | Accounting exports | `/finance/exports` | FEC-compatible CSV, treasury forecast | `GET /exports/fec` |

## H. Échéancier (all internal roles, scoped)

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| H1 | Renewals calendar | `/echeancier` | current + Symphonics contracts by end date; J-180/J-90/J-30 alerts; auto renewal tasks | `GET /echeancier` |

## I. Client portal `(portal)`

| # | Screen | Route | Content | API |
|---|---|---|---|---|
| I1 | Offer view | `/portal/offer/[token]` | offer + before/after comparator (no buy price/margin), validity | `GET /portal/offer/{token}` |
| I2 | Optional docs | `/portal/offer/[token]/docs` | RIB (IBAN/BIC check), ID, Kbis <3mo, POA — only if workflow requires | `POST /portal/documents` |
| I3 | Sign | `/portal/offer/[token]/sign` | Yousign embedded / redirect, OTP | `POST /portal/sign` |
| I4 | Status | `/portal/offer/[token]/status` | signed → in review → active | `GET /portal/offer/{token}` |

## J. Shared

- Notifications center; user notification preferences; global search (`command`, UUID-safe); settings/profile; help.

---

## State management

- Server state via TanStack Query keyed by entity + scope; URL holds filters/pagination for shareable back-office views.
- Job-driven screens (B5/B6, G1) subscribe to job status; never block the UI thread on extraction/close.
- Forms: react-hook-form + zod schemas **shared** with the server validators (single source of truth).
