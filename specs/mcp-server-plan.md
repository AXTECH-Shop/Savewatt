# SaveWatt MCP Server Plan (UI Parity on Cloudflare)

Last updated: 2026-09-18

## 1. Executive answer

Short answer: not yet.

The platform has a solid domain model and D1 schema, but backend endpoint coverage is still partial versus the UI surface. Today, only a small set of integration endpoints is live, while many UI interactions still rely on local browser state or static/demo data.

This plan defines how to reach full parity so any action available in the UI is also available through an MCP server.

## 2. Current-state assessment

## 2.1 Implemented API route handlers (current)

- `POST /api/extract`
- `POST /api/docuseal`
- `POST /api/docuseal/webhook`
- `POST /api/gifting/redemptions`
- `POST /api/gifting/webhook`

## 2.2 What the UI currently calls

- Proposal send flow calls `POST /api/docuseal`.
- Gift redemption flow calls `POST /api/gifting/redemptions`.
- Bill extraction endpoint exists but is not wired from the UI yet.

## 2.3 Coverage gap summary

| Area | UI state | API/MCP readiness |
|---|---|---|
| Dossier creation/edit/progression | Primarily browser store driven | Not API-complete |
| Pipeline/team/operator dashboards | Demo/static datasets in several screens | Not API-backed |
| Bill extraction + validation workflow | Validation UI exists; extraction endpoint exists; wiring partial | Partial |
| Supplier offer intake/comparator inputs | UI forms exist | Not API-complete |
| Signature flow | DocuSeal endpoint + webhook persistence exist | Partial (best current candidate for MCP first wave) |
| Wallet redemption | Endpoint + D1 reservation flow exists | Partial (best current candidate for MCP first wave) |
| Settings (workflows, margins, commissions, templates) | Present with disabled controls in many screens | Not API-backed |
| Finance/backoffice operations | Many screens present, multiple actions disabled/mock | Not API-complete |

## 2.4 Important implication

MCP cannot safely mirror the entire product yet, because a substantial set of UI actions is not yet represented by durable backend endpoints/services.

Therefore, this should be a dual-track program:

1. Finish API/service parity with the UI.
2. Expose that same service layer via MCP tools.

## 3. Target architecture

## 3.1 Design goals

- Every UI action corresponds to one backend service command/query.
- REST and MCP share the same domain service layer (no duplicated business rules).
- Tenant scope and role checks are identical for UI/API/MCP.
- All money and signature actions are idempotent and auditable.

## 3.2 Recommended deployment model

- Keep the existing app worker as the user-facing web app.
- Add a dedicated `savewatt-mcp` Cloudflare Worker for MCP transport and tool registry.
- Move business logic into shared server-only domain modules consumed by:
  - Next route handlers (`/api/v1/...`)
  - MCP tool handlers

This keeps MCP transport concerns separate while preserving one source of truth for validations and policy checks.

## 3.3 Authentication and authorization for MCP

- Introduce API tokens (PAT + service tokens) with:
  - `token_id`, hashed secret, owner user, owner org, scopes, expiry, status.
- Resolve token to the same actor model used by server access.
- Enforce role + org-path checks at service boundary (same rules as UI).
- Require idempotency keys for non-read tools that can cause external side effects.

## 4. Parity model: UI action -> API -> MCP tool

Create and maintain a single parity registry (machine-readable) that maps:

- UI route/component action
- backend service method
- REST endpoint
- MCP tool name
- required role/scope
- test coverage status

Suggested file: `specs/mcp-parity-matrix.yaml`.

Example naming convention for tools:

- `dossiers.list`
- `dossiers.create`
- `dossiers.update_status`
- `bills.extract`
- `bills.validate`
- `offers.compare`
- `offers.send_signature`
- `signatures.status`
- `wallet.redeem`

## 5. Delivery roadmap

## Phase 0 - Foundation and inventory (3-5 days)

Outcomes:

- Freeze the UI-to-backend parity matrix for all currently visible actions.
- Confirm canonical API contract shape (error envelope, pagination, IDs, idempotency).
- Define MCP tool naming, versioning, and auth strategy.

Deliverables:

- `specs/mcp-parity-matrix.yaml`
- `specs/mcp-auth-and-scopes.md`
- `specs/mcp-tool-contracts-v1.md`

## Phase 1 - Core commercial flow parity (1-2 weeks)

Scope (highest business value):

- Client + site creation and retrieval.
- Dossier lifecycle operations.
- Bill extraction/validation wiring.
- Supplier-offer capture.
- Comparator execution.
- Client-offer creation + send-to-signature.
- Signature status query.

API work:

- Implement `/api/v1` endpoints for the above actions using shared service modules.

MCP work:

- Expose read + write tools for the same operations.

Exit criteria:

- Critical path can be run end-to-end via UI and via MCP.

## Phase 2 - Wallet, commissions, and partner operations (1 week)

Scope:

- Commission line queries.
- Wallet balances and transaction history.
- Gift redemption initiation and status.
- Team pipeline and assignment actions.

Exit criteria:

- Partner operations reachable from MCP with policy parity.

## Phase 3 - Backoffice, finance, and settings parity (2-3 weeks)

Scope:

- Backoffice document checks and transmission actions.
- Finance close/reconciliation/invoice/export operations.
- Settings mutations (workflows, margins, commission grids, templates, branding).
- Operator-level reporting and audit-log queries.

Exit criteria:

- No feature-level dependency on browser-local state for production workflows.
- All non-disabled UI actions mapped to API + MCP.

## Phase 4 - Hardening and production rollout (1 week)

Scope:

- Rate limits, abuse controls, and token rotation flows.
- Observability (per-tool latency/error dashboards).
- Audit completeness checks.
- Incident playbook and rollback paths.

Exit criteria:

- MCP service production-ready with SLOs and operational runbooks.

## 6. Testing and quality gates

## 6.1 Contract tests

- REST contract tests for each `/api/v1` endpoint.
- MCP contract tests for each tool schema and response shape.

## 6.2 Parity tests (critical)

For each mapped action:

- Execute via UI path and via MCP path.
- Assert same domain outcome in D1.
- Assert same authorization behavior.
- Assert same audit trail semantics.

## 6.3 Idempotency tests

- Replay same mutation key; verify no duplicate side effects.
- Include provider-facing operations (DocuSeal, Tremendous).

## 7. Security and compliance controls

- Never expose raw SQL as MCP tools.
- Scope all tools to explicit role/org checks.
- Store token secrets hashed, not plaintext.
- Enforce short-lived tokens + rotation + revocation.
- Log every tool call in audit events with actor, scope, action, resource, result.
- Apply stricter rate limits to high-risk tools (signature dispatch, wallet redemption, billing close).

## 8. Data and migration work required before full MCP parity

- Replace browser-local dossier repository with D1-backed services for production flows.
- Move demo/static dashboard sources to query services.
- Wire bill extraction endpoint into the validation workflow.
- Keep external provider adapters behind idempotent service methods.

## 9. Suggested first release slice (MCP v0.1)

Start with the safest, highest-value tool set:

- Read-only:
  - `dossiers.get`
  - `dossiers.list`
  - `signatures.get`
  - `wallet.balance`
- Mutations:
  - `offers.send_signature`
  - `wallet.redeem`

Then expand to create/update flows once `/api/v1` parity lands.

## 10. Definition of done (program level)

The MCP parity program is complete when all are true:

- Every non-disabled UI action has a backend service command/query.
- Every such service is reachable via both REST and MCP.
- UI and MCP parity tests pass for all mapped actions.
- No production-critical workflow depends on local browser persistence.
- Security, auditability, idempotency, and operational SLO gates pass.

## 11. Immediate next actions

1. Approve this plan and confirm the MCP auth model (PAT only vs PAT + service tokens).
2. Build the parity registry (`specs/mcp-parity-matrix.yaml`) from current routes/components.
3. Implement Phase 1 `/api/v1` endpoints for the core commercial flow.
4. Stand up `savewatt-mcp` with the v0.1 tool slice.

## 12. Future of the application (why MCP should start admin-first)

The product trajectory is clear and should drive MCP shape:

1. Near term (first ~100 deals): manual Symphonics intake, durable CRM and dossier operations, proposal generation, signature completion, auditable operator control.
2. Mid term: fully writable branch configuration (workflows, margins, commissions), back-office processing, and secure customer portal completion on production data.
3. Later: monthly close automation (consumption import, reconciliation, invoicing, payout flows), broader integrations, and deeper operational analytics.

This means the first MCP release should focus on operator/admin throughput, not broad role parity. The right strategy is "admin-first command surface now, full parity after API maturity."

## 13. Admin-first MCP strategy (recommended)

## 13.1 Scope for phase one

- Primary MCP users: `SUPER_ADMIN`, `OPERATOR_FINANCE`.
- Secondary (later): `MASTER_ADMIN`, `MASTER_BACKOFFICE`.
- Exclude customer-portal tools from phase one.

## 13.2 Recommended MCP domains and tools

Use one MCP server with namespaced tools rather than multiple servers now. It reduces auth, deployment, and observability complexity.

### A. Onboarding and governance

- `registration_requests.list`
- `registration_requests.approve`
- `registration_requests.reject`
- `organizations.create_master`
- `organizations.create_branch_node`
- `memberships.invite`
- `memberships.update_role`

### B. Dossier intake and validation

- `clients.create`
- `sites.create`
- `dossiers.create`
- `dossiers.attach_document`
- `bills.extract`
- `bills.extraction_status`
- `bills.validate`
- `dossiers.transition_stage`

### C. Offer build and signature

- `supplier_offers.create_manual`
- `comparisons.run`
- `client_offers.create`
- `client_offers.generate_pdf`
- `client_offers.send_for_signature`
- `signatures.status`

### D. Commission and margin control

- `commission_grids.create_version`
- `commission_grids.publish_version`
- `commission_grids.get_effective`
- `margin_grids.create_version`
- `margin_grids.publish_version`

### E. Operator control plane

- `reports.pipeline_summary`
- `reports.integration_health`
- `audit.search`
- `impersonation.start`
- `impersonation.stop`

## 13.3 Minimal v1 tool bundle for your current priority

If you want immediate value on the actions you listed, ship this subset first:

1. `dossiers.create`
2. `dossiers.attach_document`
3. `bills.extract`
4. `bills.validate`
5. `supplier_offers.create_manual`
6. `comparisons.run`
7. `client_offers.create`
8. `client_offers.send_for_signature`
9. `organizations.create_master`
10. `commission_grids.create_version`
11. `commission_grids.publish_version`
12. `audit.search`

This subset directly supports:

- upload customer dossier,
- create custom offer and send,
- register a new régie,
- set and publish commission rules,
- and keep operator traceability.

## 14. API prerequisites for the admin-first MCP bundle

The MCP tools above should only call stable service endpoints. For phase one, prioritize API completion for:

- dossier create/update/transition,
- document upload + extraction + validation,
- supplier-offer intake and comparison,
- offer versioning + send/signature status,
- organization and commission-grid write operations,
- audit query endpoints.

Until these services are durable and policy-complete, MCP tools should be marked `planned` (not exposed) to avoid automating demo-only behavior.

## 15. Release policy for MCP tools

Per tool state machine:

- `draft`: schema exists, service incomplete.
- `internal-beta`: available to one admin org with audit logging.
- `ga`: parity tests passing (UI vs API vs MCP), idempotency validated, on-call runbook complete.

Do not publish write tools to GA unless the corresponding UI action is already backed by durable D1 persistence and role/scope enforcement.
