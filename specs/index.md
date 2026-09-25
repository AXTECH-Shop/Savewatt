# Savewatt — Specification Pack

> Implementation-ready spec pack for the **Savewatt** pivot: a B2B multi-tenant SaaS to operate energy commercial régies with **Symphonics** as the electricity supplier partner. Generated from `docs/prompt_plateforme_regies_symphonics.md` + locked decisions (2026-09-15).

## Stack summary (hard constraints — `preferences.yaml`)

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui (mobile-first) · Node/TS layered API (route handlers, domain/service/repository) · **PostgreSQL 15 + RLS on all business tables + ltree** · Drizzle · S3 (EU) · BullMQ/Redis · Playwright HTML→PDF (**Factur-X**) · Yousign v3 · Claude bill extraction · Argon2id + MFA · UUID v7 · immutable hash-chained audit · envelope KMS (IBAN/RIB/ID) · **OWASP ASVS L2** · EU hosting.

## v1 locked decisions

Symphonics-only (behind connector seam) · electricity-only (nullable gas fields) · consolidated invoicing (AX TECH sole biller) · ID/RIB optional per workflow · Symphonics API assumed absent (CSV import) · commission **66% of margin → 50/50 AX TECH/master → cascade**, margin base configurable.

## Documents

| Doc | What it covers |
|---|---|
| [brief-normalized.md](brief-normalized.md) | Structured brief: goals, non-goals, roles, workflows, integrations, metrics |
| [preferences.yaml](preferences.yaml) | Stack + security + v1 decisions as hard constraints (source of truth) |
| [design-system.md](design-system.md) | Tokens, components (shadcn/reui), white-label theming, a11y, signature patterns |
| [backend-specs.md](backend-specs.md) | **Canonical domain model, DB schema + RLS (deliverable #1)**, tenancy, auth, commission engine, jobs |
| [rights-matrix.md](rights-matrix.md) | **Rights matrix (deliverable #2)** — RBAC × ltree scope × RLS enforcement + isolation tests |
| [frontend-specs.md](frontend-specs.md) | **Screen list (deliverable #3)** — screen-by-screen by role, routes, components, API deps |
| [api-docs.md](api-docs.md) | REST `/api/v1` endpoints, schemas, auth, idempotency, webhooks |
| [ai-services.md](ai-services.md) | Bill extraction pipeline, strict JSON schema, confidence/flags, guardrails, cost |
| [cloud-architecture.md](cloud-architecture.md) | Deployment profiles, runtime diagram, scaling, DR, security, white-label, on-prem status |
| [delivery-lots.md](delivery-lots.md) | **Delivery plan Lots 1–7 (deliverable #4)** with blocking test gates |
| [execution-blueprint.md](execution-blueprint.md) | **Current-state gap analysis and ordered execution plan** across admin, régie, customer, CRM, proposal/PDF, configuration, commissions, and launch gates |
| [mcp-server-plan.md](mcp-server-plan.md) | MCP parity roadmap: align UI actions with backend services and expose them via Cloudflare-hosted MCP tools |
| [decisions.md](decisions.md) | Accepted decisions + rationale |
| [open-questions.md](open-questions.md) | Unresolved items (Symphonics format, margin base default, legal, cloud provider…) |

## The four brief-mandated pre-code deliverables

1. **DB schema** → `backend-specs.md` §3–§4
2. **Rights matrix** → `rights-matrix.md`
3. **Screen list** → `frontend-specs.md`
4. **Delivery-lot plan** → `delivery-lots.md`

## Acceptance fixture

The **JOSH case** (§7.4 of the brief) is the golden fixture across extraction, comparator, and commission unit tests — blocking in CI.

## Immediate next steps

1. Resolve blocking open questions **OQ1–OQ5** (Symphonics CSV format, margin base, commission grids, Factur-X/PA, Yousign) — see `open-questions.md`.
2. Stand up **Lot 0 + Lot 1** (foundations + org/auth/RLS + isolation tests).
3. Prototype the **comparator against JOSH** early (de-risks the product core before the full platform).
