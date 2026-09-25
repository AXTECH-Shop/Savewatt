# Savewatt — Delivery Plan (Lots 1–7)

> Mandated pre-code deliverable #4. Incremental lots; each ships with its own tests. Multi-tenant isolation tests and calculation tests are **blocking CI gates**. Aligns with brief §15.

## Lot 0 — Foundations (pre-Lot 1 scaffolding)
- Repo, monorepo/app structure (`domain/service/repository`), CI, IaC skeleton (dev/staging/prod), Sentry, secrets vault, Postgres 15 + `ltree`/`pgcrypto`, Drizzle migrations, BullMQ/Redis, S3 (EU), KMS wiring.
- **Exit:** environments provisioned; migrations run; health checks green.

## Lot 1 — Organizations, roles, auth, RLS, isolation tests
- `organizations` (ltree), `users`, `memberships`, `permission_sets`, `invitations`, `sessions`, `mfa_credentials`.
- Argon2id + HIBP, MFA (TOTP + WebAuthn + backup codes), invitations, reset, session mgmt, brute-force protection.
- RLS policies + GUC middleware (`app.user_id/org_path/role/apporteur`); impersonation with banner + audit.
- Immutable hash-chained `audit_log`.
- **Blocking tests:** full role × resource isolation suite (read/write/enumerate, UUID-guessing → 404, missing-GUC fail-closed).
- **Exit:** a master admin can build their org tree + invite users; no cross-branch leakage.

## Lot 2 — Clients, sites, bill capture & extraction, contrat-actuel
- `clients`, `client_contacts`, `sites` (PDL/PRM check, nullable gas), `current_contracts`.
- `bill_uploads` (AV/OCR), `bill_extractions` (Claude structured extraction + confidence), validation split-view.
- Contrat-actuel recap card; INSEE Sirene autocomplete.
- **Blocking tests:** extraction schema conformance; per-field confidence present; validation gate; JOSH bill fields extracted.
- **Exit:** apporteur uploads a bill → validated structured current contract with countdown + flags (incl. reconduction).

## Lot 3 — Symphonics offers, margin, comparator, offer PDF
- `suppliers` (Symphonics seed), `supplier_offers` (CSV/Excel/PDF import via connector), `margin_grids`, `client_offers`.
- **Comparator engine** (à périmètre identique, per-cadran, savings HT/TTC, alert set) — the product core.
- Offer PDF (Playwright, master charte; hides buy price/margin).
- **Blocking tests:** comparator reproduces JOSH §7.4 expected results within tolerance; margin bounds enforced; alert triggers.
- **Exit:** apporteur imports a Symphonics offer, applies margin, sees comparator, generates a branded offer PDF.

## Lot 4 — Workflow engine, Yousign, client portal, optional docs
- `workflows` (visual editor, versioned), `dossiers`, `dossier_events`, `documents` (KMS-enc, retention).
- Yousign API v3 (requests, positioned fields, OTP, reminders), webhooks, proof archive (10y).
- Client portal: offer view, optional RIB/ID/KBIS/POA (workflow-gated), sign, status.
- Back-office validation queue + doc check + transmit-prep.
- **Blocking tests:** workflow versioning immutability; webhook HMAC verify + idempotency; portal scope (client sees only own dossier, no prices/margin).
- **Exit:** full sell→sign→back-office-check flow with a configurable workflow.

## Lot 5 — Supplier connector, transmission, status (Symphonics)
- `SupplierConnector` interface + `SymphonicsCsvConnector`; contract transmission package + ack; manual/CSV status updates.
- `webhook_deliveries` (outbound signed, replayable), idempotency keys, call log (no PII in clear).
- **Blocking tests:** connector contract tests; idempotent transmission; replay of failed deliveries.
- **Exit:** signed contracts transmit to Symphonics (export+ack in v1) and receive status; API connector is a drop-in later.

## Lot 6 — Monthly close, commissions, Factur-X, reconciliation
- `consumption_records` import; `commission_grids`, `commission_runs`, `commission_lines` (66% → 50/50 → cascade, configurable margin base, clawback).
- Reconciliation (`reconciliation_anomalies`): volume diff / missing / unknown → resolve screen.
- Consolidated Factur-X `invoices` (continuous numbering, per-contract annex); commission statements + self-billing.
- **Blocking tests:** commission math unit tests (JOSH + synthetic cascade); cascade sum ≤ master share; Factur-X validates; numbering continuity; reconciliation catches every contract.
- **Exit:** a full month closes → AX TECH invoices Symphonics + commission statements cascade.

## Lot 7 — Dashboards, échéancier, exports, hardening, pentest
- Operator / master / apporteur dashboards; échéancier with J-180/90/30 auto-tasks; Excel/FEC exports; treasury forecast.
- Security hardening: CSP/headers, rate limits, dependency scan gates, retention purge + proof, restore test, DR runbook.
- **External pentest before prod**; then annual.
- **Exit:** production-ready; ASVS L2 evidence collected; demo data seeded (2 masters, 3 sub-régies, 10 apporteurs, JOSH case).

## Cross-cutting test coverage (all lots)
- Unit: all calculations (comparator, commissions, invoices).
- Integration: API + connectors (Symphonics CSV, Yousign, INSEE).
- E2E (Playwright): main journeys (sell, sign, close).
- **Blocking:** multi-tenant isolation + calculation suites gate every deploy.

## Suggested sequencing note
Lots 1→2→3 deliver the highest-value vertical (isolation + bill + comparator) fastest; 4→5 complete the contract lifecycle; 6→7 close the money loop and harden. Lots 2 and 3's comparator can be prototyped early against the JOSH fixture to de-risk the product core.
