# Savewatt — Normalized Brief

> Structured extraction of `docs/prompt_plateforme_regies_symphonics.md` + locked decisions from the pivot Q&A (2026-09-15). Source of truth for scope; the stack lives in `preferences.yaml`.

## 1. Project

- **Name:** Savewatt
- **Purpose:** Production B2B multi-tenant SaaS to run energy commercial régies. A network of resellers (régies) sells Symphonics electricity to business clients; the platform captures the client's current bill, compares it to a Symphonics price proposal plus margin, produces the offer, e-signs it (Yousign), transmits it to Symphonics, ingests monthly consumption, and settles the commission cascade with Factur-X invoicing.
- **Operator:** AX TECH (super-admin, sole biller to Symphonics).
- **Not a prototype** — production app with data model, API, screens, access rules, and automated tests per module.

## 2. Goals

1. Strict multi-tenant isolation enforced **in the database (RLS)**, not just app code.
2. Bill → structured data via LLM extraction with human validation.
3. Accurate before/after comparator at "périmètre identique" (JOSH test case is the acceptance fixture).
4. Configurable per-company workflow engine driving offer → sign → transmit → active → billing → renewal.
5. Monthly commission cascade + consolidated Factur-X invoicing to Symphonics.
6. OWASP ASVS L2 security posture and RGPD compliance with parameterable retention/purge.

## 3. Non-goals (v1)

- **Gas** (schema keeps nullable PCE/gas fields, but no gas comparator/rules in v1).
- **Multiple suppliers** (Symphonics only; isolated behind a `SupplierConnector` seam).
- **Masters invoicing Symphonics directly** (consolidated by AX TECH only).
- **Live Symphonics API** (assume absent; CSV/Excel import + replaceable connector).

## 4. Roles & personas

| Role | Persona | Primary need |
|---|---|---|
| SUPER_ADMIN | AX TECH platform admin | Create masters, configure Symphonics params, global audit |
| OPERATOR_FINANCE | AX TECH finance | Symphonics invoicing, reconciliation, accounting exports |
| MASTER_ADMIN | Régie owner | Create sub-régies/teams/users, workflows, margin & commission grids, doc templates |
| MASTER_BACKOFFICE | Régie back-office | Validate dossiers, check documents, transmit to supplier |
| SUB_REGIE_ADMIN | Sub-régie owner | Same as master within parent-set limits |
| TEAM_MANAGER | Team lead | Pipeline, reassign clients within team |
| APPORTEUR | Field sales | Create client, upload bill, build offer, send to sign, track commissions |
| READ_ONLY / AUDITEUR | Auditor | Read-only within assigned scope |
| SUPPLIER_API (Symphonics) | Supplier system | API-only access to transmitted contracts (deferred: no live API in v1) |
| CLIENT | End business client | Portal: view offer, sign, upload RIB/docs |

## 5. Key workflows / journeys

1. **Apporteur sells:** create prospect → upload current bill(s) → auto-extract + validate → request/import Symphonics proposal → generate client offer (margin applied) → send to Yousign → client signs → back-office checks → transmit to Symphonics → active.
2. **Monthly close:** ingest Symphonics consumption feed (CSV) → reconcile per contract → compute commissions → generate consolidated Factur-X to Symphonics → generate commission statements/self-billing down the cascade → track collection.
3. **Renewal:** échéancier alerts J-180/J-90/J-30 → auto-create renewal tasks.
4. **Admin:** create master (identity, branding, subdomain, workflow, grids, templates, first admin invite); manage dated regulatory params (accise, CTA, TVA, TURPE).

## 6. Default workflow (versioned per company)

Prospect → bill(s) uploaded → auto-analysis + human validation → Symphonics price request/import → proposal received → client offer generated (margin + before/after) → internal validation (if margin out-of-grid or above threshold) → Yousign send → signed → back-office doc check → transmitted to Symphonics → accepted/refused (motif) → active (supply start) → monthly billing → renewal window (alerts) → terminated/expired/lost (motif required).

## 7. Integrations

| Integration | Status v1 | Notes |
|---|---|---|
| Symphonics | CSV/Excel import behind `SupplierConnector` | Real REST API planned; connector is drop-in |
| Yousign | API v3 | Signature requests, webhooks, proof archive |
| INSEE Sirene | REST | SIREN/SIRET autocomplete for clients |
| Email | SPF/DKIM/DMARC domain | Transactional |
| SMS | provider TBD | OTP + notifications |
| ClamAV | self-host/service | Upload antivirus |
| KMS | vault/cloud KMS | Envelope encryption |
| Sentry | SaaS/self-host EU | Errors |

## 8. Commission (locked)

`M = sale_price − symphonics_price` per MWh (margin base **configurable**, default electron+CEE+capacité).
- Symphonics → network: **66% of M** (Symphonics keeps 34%).
- First split of the 66% pool: **50% AX TECH / 50% master régie**.
- Master's share cascades to sub-régies → teams → apporteurs via **configurable grids**.
- Accrued **monthly on MWh consumed**. Clawback configurable on early termination.

## 9. Success metrics

- 100% of business tables covered by passing RLS isolation tests (blocking in CI).
- Comparator reproduces the JOSH §7.4 expected results within rounding tolerance.
- Bill extraction: per-field confidence surfaced; no dossier advances without human validation.
- Monthly close reconciles every contract or raises an anomaly; zero silently-dropped contracts.
- Factur-X invoices validate against the standard; continuous numbering per issuing entity.

## 10. Hard constraints (from preferences.yaml)

EU hosting; Postgres 15 + RLS + ltree; Drizzle; Next.js + shadcn/ui mobile-first; BullMQ/Redis; Playwright/Factur-X; Yousign; Claude extraction; Argon2id + MFA; UUID v7; immutable audit log; envelope KMS for IBAN/RIB/ID; ASVS L2.
