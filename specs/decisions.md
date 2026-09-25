# Savewatt — Architectural Decisions

> Accepted decisions + rationale. Open items live in `open-questions.md`.

## Product / scope (locked with stakeholder, 2026-09-15)

| # | Decision | Rationale |
|---|---|---|
| D1 | App name = **Savewatt** | Platform keeps its brand; "Symphonics" is the supplier, not the product |
| D2 | **Symphonics-only** supplier in v1, behind a `SupplierConnector` seam | Fastest to ship; a 2nd supplier is additive (drop-in connector), no schema teardown |
| D3 | **Electricity-only** v1; nullable gas fields (PCE) retained | Matches the JOSH fixture and current demand; gas slots in later without migration pain |
| D4 | **Consolidated invoicing** — AX TECH is the sole legal biller to Symphonics | Simplest numbering/reconciliation; masters never invoice Symphonics directly |
| D5 | **ID/RIB optional**, driven by the workflow engine | RGPD data-minimization; only collect what a given master's process needs |
| D6 | Symphonics API treated as **unavailable** → CSV/Excel import at same schema | Unblocks build now; real API is a drop-in connector implementation later |
| D7 | Commission = **66% of gross margin M**; first split **50/50 AX TECH / master**; cascade via configurable grids | Stakeholder-stated ("we get 66… 33% goes to the régie, half of what we get") |
| D8 | Commission **margin base = configurable**, default electron+CEE+capacity | Stakeholder unsure; default matches the §7.3 "périmètre identique" comparator; confirm before go-live |

## Technical

| # | Decision | Rationale |
|---|---|---|
| T1 | Stack per `preferences.yaml` (Next.js+shadcn / Node-TS layered / Postgres15+RLS+ltree / Drizzle / BullMQ / S3 EU / Playwright Factur-X) | **Imposed** by the brief; overrides the arch-orchestrator default (Cloudflare) template |
| T2 | API = **Next.js route handlers** in domain/service/repository layers (not a separate NestJS service) in v1 | Avoids a second deployable; NestJS remains an option if a partner API is opened early (see OQ) |
| T3 | Tenancy via **ltree path + RLS** with `SET LOCAL app.*` GUCs; fail-closed without context | Isolation enforced in the DB, not just code (brief §3.1); defense in depth with service-layer checks |
| T4 | **UUID v7** app-generated PKs everywhere | Non-guessable, time-ordered; blocks enumeration (brief §3.1) |
| T5 | Audit log **append-only, hash-chained**, nightly integrity check | Immutability requirement (brief §4.2) |
| T6 | Envelope **KMS encryption** for IBAN/RIB/ID/API keys (application-level) | Brief §4.2; managed profile only in v1 |
| T7 | Bill extraction via **Claude, strict JSON schema, temperature 0, human validation gate** | Accuracy + RGPD; AI proposes, human decides (brief §7.1) |
| T8 | Default cloud = **managed multi-tenant SaaS, EU**; white-label conditional; BYOC planned; on-prem not v1 | Matches EU-only hosting requirement; portability gaps documented |
| T9 | Workflows **versioned**; dossiers pinned to their creation version | Brief §5; prevents mid-flight rule changes |
| T10 | **JOSH §7.4** is the golden fixture for extraction + comparator + commission unit tests | Provides an objective acceptance target |

## Pivot updates (locked with stakeholder, 2026-09-16)

These supersede the corresponding rows above where they conflict.

| # | Decision | Supersedes | Rationale |
|---|---|---|---|
| P1 | **Deploy on Cloudflare** — Pages/Workers + R2 (files) + Workers (API/OCR/PDF/webhooks); DB = D1 **or** Postgres-via-Hyperdrive (open) | reverses T1 (was AWS/S3-imposed) | Stakeholder-chosen stack; internal-first tool. DB choice tracked in `../savewatt-platform/STATUS.md` (D1 = no RLS/ltree; Postgres = spec RLS). |
| P2 | **Auth = Clerk** (`@clerk/nextjs`), Clerk app `app_3JPV3nFJ93vMEREw7oPTvOotEJO`; MFA/orgs via Clerk | replaces the Argon2id/MFA/session build in Lot 1 | Faster, hardened auth; org hierarchy still modeled in-app (materialized path). Revisit RLS GUC wiring since RLS may move app-side on D1. |
| P3 | **OCR/extraction = Google Gemini 3 Flash** via Agent Platform, **ADC only (no API keys)** | replaces T7 (Claude) | Org policy disallows API keys; ADC via `gcloud auth login`. Strict JSON schema + per-field confidence + human validation gate unchanged. |
| P4 | **E-signature = DocuSeal** (skill `docuseal-code` installed) | replaces Yousign (Lot 4) | Chosen provider; embedded signing + `submission.completed` webhook → Signed. Cloud vs self-host (EU) open. |
| P5 | **Partner earnings redeemable via GoGift API** (gift cards) on top of the commission cascade | additive to D7 | New monetization/redemption layer; wallet/ledger per partner, vesting rules open. |

## Preference file

Created `specs/preferences.yaml` (none existed). Recorded here per skill Phase 0.
Note: `preferences.yaml` predates the 2026-09-16 pivot; P1–P5 above are authoritative where they differ.
