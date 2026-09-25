# Savewatt — Rights Matrix (RBAC + hierarchical scope + RLS)

> Mandated pre-code deliverable #2. Authorization = **role** (what actions) × **scope** (which rows, via ltree) enforced in **both** the service layer and Postgres RLS. Roles and entities match `backend-specs.md`.

## 1. Scope model

| Scope token | Meaning (RLS predicate) |
|---|---|
| `SELF+DESC` | `org_path <@ app.org_path` — the org and all descendants |
| `TEAM` | descendants of the manager's TEAM org |
| `OWNED` | `owner_apporteur_id = app.apporteur` |
| `ASSIGNED` | explicit read scope granted to auditor |
| `PLATFORM` | whole platform (OPERATOR root) |
| `TRANSMITTED` | only contracts transmitted to that supplier (deferred in v1) |
| `DOSSIER` | the client's own dossier only |

Parents can **restrict** children's configuration rights (e.g. cap margin, force mandatory steps) — a child never exceeds parent-set limits even if its role nominally allows it.

## 2. Role → permission grid

Legend: ✔ full · R read-only · — none · ⚙ configure (subject to parent limits)

| Resource \ Role | SUPER_ADMIN | OPERATOR_FINANCE | MASTER_ADMIN | MASTER_BACKOFFICE | SUB_REGIE_ADMIN | TEAM_MANAGER | APPORTEUR | READ_ONLY | SUPPLIER_API | CLIENT |
|---|---|---|---|---|---|---|---|---|---|---|
| Scope | PLATFORM | PLATFORM | SELF+DESC | SELF+DESC | SELF+DESC | TEAM | OWNED | ASSIGNED | TRANSMITTED | DOSSIER |
| organizations | ✔ | R | ⚙ (create sub-régies/teams) | R | ⚙ (within limits) | R | — | R | — | — |
| users / memberships | ✔ | — | ✔ (invite in branch) | R | ✔ (within limits) | R (team) | — | — | — | — |
| permission_sets | ✔ | — | ⚙ | — | ⚙ | — | — | — | — | — |
| workflows | ✔ | — | ⚙ | R | ⚙ (if allowed) | R | R | R | — | — |
| margin_grids | ✔ | R | ⚙ | R | ⚙ (≤ parent) | — | — | R | — | — |
| commission_grids | ✔ | R | ⚙ (direct children) | R | ⚙ (direct children) | R (own payouts) | R (own) | — | — | — |
| clients / contacts | ✔ | R | ✔ | ✔ | ✔ | ✔ (team) | ✔ (OWNED) | R | — | — |
| sites / current_contracts | ✔ | R | ✔ | ✔ | ✔ | ✔ (team) | ✔ (OWNED) | R | — | — |
| bill_uploads / extractions | ✔ | R | ✔ | ✔ (validate) | ✔ | ✔ (team) | ✔ (OWNED, upload) | R | — | — |
| supplier_offers | ✔ | R | ✔ | ✔ | ✔ | R | R (OWNED dossier) | R | — | — |
| client_offers | ✔ | R | ✔ | ✔ | ✔ | ✔ (team) | ✔ (OWNED, create/send) | R | — | R (own, view) |
| dossiers / events | ✔ | R | ✔ | ✔ (advance) | ✔ | ✔ (reassign in team) | ✔ (OWNED) | R | — | R (own) |
| documents (RIB/ID/KBIS) | ✔ | R (masked) | ✔ | ✔ (check) | ✔ | R | ✔ (OWNED, request) | — | — | ✔ (own, upload) |
| contracts | ✔ | R | ✔ | ✔ (transmit) | ✔ | R | R (OWNED) | R | R (TRANSMITTED) | R (own) |
| consumption_records | ✔ | ✔ (import) | R | R | R | R (team) | R (OWNED) | R | ✔ (write, deferred) | — |
| commission_runs / lines | ✔ | ✔ | R (branch payouts) | R | R (branch) | R (own+direct) | R (OWNED, acquired/upcoming) | R | — | — |
| invoices (→ Symphonics) | ✔ | ✔ (issue/consolidated) | — | — | — | — | — | R | R (own) | — |
| reconciliation_anomalies | ✔ | ✔ | R (branch) | R | R | — | — | R | — | — |
| regulatory_params | ✔ | R | R | R | R | R | R | R | — | — |
| audit_log | ✔ (global) | R (finance events) | R (branch) | R (branch) | R (branch) | — | — | R (ASSIGNED) | — | — |
| impersonation | ✔ (any branch) | — | ✔ (own branch) | — | — | — | — | — | — | — |
| message_templates | ✔ | — | ⚙ | R | ⚙ | — | — | — | — | — |

Notes:
- **OPERATOR_FINANCE** sees financial data platform-wide but sensitive PII (RIB/ID content) is **masked** — it works with amounts and references, not identity documents.
- **APPORTEUR** commissions view is `OWNED` only; they never see parent margins or other apporteurs.
- **SUPPLIER_API** and its `TRANSMITTED` scope are **specified but deferred** in v1 (no live Symphonics API). Policies exist; the role is inactive until the API connector ships.
- **CLIENT** is portal-only: their own offer/contract/documents, sign, upload — never prices of purchase or margin.

## 3. Fine-grained permissions

Permissions are `resource:action` strings (e.g. `client_offer:send`, `contract:transmit`, `margin_grid:configure`, `user:impersonate`). Roles are bundles; masters compose **custom roles** (`permission_sets`) from the same atoms, always bounded by their own granted scope and parent-set limits.

## 4. Enforcement & tests

1. **Service layer:** `assert(can(actor, 'resource:action', target))` before any mutation — fast, returns 403/404.
2. **RLS:** every business query runs under `app.org_path`/`app.role`/`app.apporteur`; even a service-layer bug cannot leak cross-branch rows.
3. **Blocking isolation tests (CI gate):** for each role × resource × (read/write/enumerate), assert branch-X actor cannot touch branch-Y data, and that missing GUCs fail closed. Includes UUID-guessing attempts (must 404). Deploy blocks on any failure.
