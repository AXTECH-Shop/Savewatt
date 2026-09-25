# Savewatt — Backend Specifications

> SOURCE OF TRUTH for the domain model, database schema, tenancy, auth, and the commission engine. All other specs reference the entity names defined here. Stack constraints: `preferences.yaml`.

---

## 1. Architecture layers

```
HTTP (Next.js route handlers OR NestJS controllers)
  → Zod input validation (every request)
  → Service layer (domain logic, transactions, workflow engine, commission engine)
  → Repository layer (Drizzle; sets RLS GUCs per request)
  → PostgreSQL 15 (RLS enforced on all business tables)
Side channels: BullMQ workers (OCR, extraction, PDF, webhooks, monthly close), S3, KMS, Yousign, INSEE, email/SMS.
```

**Decision (see decisions.md):** default to **Next.js route handlers** structured in `domain/service/repository` folders, co-located with the app, to avoid a second deployable in v1. A standalone NestJS service is a documented option if the API is opened to Symphonics/partners before the app matures.

### 1.1 The Supplier seam (v1 = Symphonics only)

All supplier-specific logic sits behind one interface so a 2nd supplier is additive:

```ts
interface SupplierConnector {
  requestPricing(input: PricingRequest): Promise<SupplierRef>;         // v1: no-op / manual
  importOffer(source: CsvRow | PdfDoc): Promise<SupplierOffer>;        // v1: CSV/Excel + PDF pipeline
  transmitContract(contract: Contract): Promise<TransmissionReceipt>;  // v1: export package + manual ack
  ingestMonthlyConsumption(period: Period, rows: CsvRow[]): Promise<ConsumptionBatch>;
  fetchContractStatus?(ref: SupplierRef): Promise<ContractStatus>;     // v1: manual status update
}
// v1 implementation: SymphonicsCsvConnector. Real API → SymphonicsApiConnector (drop-in).
```

---

## 2. Multi-tenancy strategy (the core of the system)

- **Org tree via `ltree`.** Every organization has a materialized `path` (e.g. `axtech.solarfinance.team_paris`). "See self + descendants" = `path <@ current_org_path`.
- **UUID v7** primary keys everywhere (app-generated, time-ordered, non-guessable). Never expose sequential ids.
- **RLS on every business table.** Each request opens a transaction and sets:
  ```sql
  SET LOCAL app.user_id   = '<uuid>';
  SET LOCAL app.org_path  = '<ltree path of the actor''s org>';
  SET LOCAL app.role      = '<role>';
  SET LOCAL app.apporteur = '<uuid|null>';   -- for APPORTEUR ownership scoping
  ```
  A query with **no** `app.org_path` set fails closed (policies require the GUC).
- **Isolation rule matrix:**
  - Org sees itself + descendants; never siblings; never ancestors' private data.
  - Master never sees another master; sub-régie never sees a sibling sub-régie.
  - APPORTEUR sees only rows they own (`owner_apporteur_id = app.apporteur`).
  - TEAM_MANAGER sees rows whose owning org is their team subtree.
  - Shared-down resources (doc templates, price-ceiling grids) are readable by descendants via an explicit `shared_scope` path check.
- **Blocking isolation test suite:** for every role × every resource, assert user A of branch X cannot read / write / enumerate branch Y. CI gate; deploy blocks on failure.

---

## 3. Canonical domain model

Grouped by bounded context. Types abbreviated; all tables also carry `id uuid pk`, `created_at`, `updated_at`, and (business tables) `org_id` + `org_path ltree`.

### 3.1 Identity & org
- **organizations** — `parent_id`, `path ltree`, `type` (OPERATOR|MASTER|SUB_REGIE|TEAM), `legal_name`, `siren`, `siret`, `tva`, `address`, `iban_enc`, `logo_url`, `charte jsonb`, `workflow_id`, `commission_grid_id`, `margin_grid_id`, `status`.
- **users** — `email`, `password_hash` (argon2id), `full_name`, `status`, `mfa_enrolled`, `primary_org_id`.
- **memberships** — `user_id`, `org_id`, `role`, `custom_permission_set_id?` (a user can hold roles in multiple orgs).
- **permission_sets** — master-defined custom roles: array of `resource:action`.
- **invitations** — signed single-use, 72h expiry.
- **sessions** — server-side, revocable; device, ip, `elevated_at`.
- **mfa_credentials** — TOTP + WebAuthn; `backup_codes_enc`.

### 3.2 Commercial / CRM
- **clients** — `legal_name`, `siren`, `siret`, `naf`, `headcount`, `revenue`, `address`, `owner_apporteur_id`, `org_id`.
- **client_contacts** — name, role, email, phone.
- **sites** — `client_id`, `address`, `pdl_prm` (14 digits, format-checked), `pce` (gas, **nullable**), `segment` (C2|C3|C4|C5), `acheminement_tariff`, `meter_type`, `subscribed_power_by_cadran jsonb`, `counting_id`.
- **current_contracts** — `site_id`, `supplier_name`, `offer_name`, `contract_ref`, `subscribed_at`, `expires_at`, `tacit_renewal bool`, `renewal_term`, `notice_period`, `price_by_cadran jsonb`, `subscription`, `annex_services jsonb`.

### 3.3 Supplier & offers
- **suppliers** — v1 seed row `Symphonics`. (`code`, `name`, `connector_type`.) Kept minimal; referenced by `supplier_id` for the future seam.
- **supplier_offers** — `supplier_id`, `pdl_prm`, `supply_period`, `valid_until`, `forecast_conso_by_cadran jsonb`, `power_entered`, `power_advised`, `electron_price_by_cadran jsonb`, `subscription`, `cee_eur_mwh`, `capacity_power`, `capacity_price`, `budget jsonb`, `source_pdf_url`, `import_source` (API|CSV|PDF).
- **client_offers** — `supplier_offer_id`, `margin_mode` (per_cadran|global), `margin_by_cadran jsonb` / `margin_global`, `final_price_by_cadran jsonb`, `client_budget jsonb`, `valid_until` (≤ supplier valid_until), `status`, `pdf_url`, `version`, `parent_offer_id?`.
- **contracts** — `client_offer_id`, `yousign_request_id`, `signed_at`, `proof_url`, `supplier_status` (PENDING|ACCEPTED|REFUSED|ACTIVE|TERMINATED|EXPIRED), `supplier_status_motif`, `supplier_contract_ref`, `supply_start`, `supply_end`.

### 3.4 Bill analysis
- **bill_uploads** — `client_id`, `site_id?`, `file_url`, `mime`, `av_status`, `ocr_status`, `extraction_status`.
- **bill_extractions** — `bill_upload_id`, `raw_json jsonb`, `fields jsonb` (value + confidence per field), `validated_by?`, `validated_at?`, `flags jsonb` (reconduction/incoherence/etc.).

### 3.5 Workflow
- **workflows** — `org_id`, `name`, `version`, `definition jsonb` (steps, order, conditions, required docs, validations, SLAs, notifications, auto-actions), `is_default`.
- **dossiers** — the moving unit: `client_id`, `site_ids[]`, `workflow_id`, `workflow_version`, `current_stage`, `assigned_to`, `owner_apporteur_id`, `sla_due_at`.
- **dossier_events** — append-only stage transitions, actor, motif, payload.
- **documents** — `dossier_id`, `type` (RIB|ID|KBIS|POA|OFFER_PDF|CONTRACT_PDF|SEPA), `file_url_enc?`, `status`, `retention_purge_at`.

### 3.6 Billing & commissions
- **margin_grids** — `org_id`, `min/max €/MWh` by cadran or global, effective dates.
- **commission_grids** — `org_id`, `level`, rule (`eur_per_mwh` | `percent` | `signature_prime`), `cap`, effective dates, `clawback_rule jsonb`.
- **consumption_records** — `contract_id`, `period`, `mwh_by_cadran jsonb`, `invoiced_amount`, `client_payment_status`, `import_batch_id`.
- **commission_runs** — `period`, `status`, `anomalies_count`.
- **commission_lines** — `commission_run_id`, `contract_id`, `beneficiary_org_id` (or apporteur), `basis`, `margin_amount`, `rate_applied`, `amount`, `clawback_amount`.
- **invoices** — `issuer_org_id` (AX TECH in v1), `recipient` (Symphonics), `number` (continuous per issuer), `period`, `facturx_xml_url`, `pdf_url`, `total_ht`, `total_ttc`, `status`, `lines jsonb` (per-contract annex).
- **reconciliation_anomalies** — `period`, `type` (VOLUME_DIFF|MISSING_CONTRACT|UNKNOWN_CONTRACT), `contract_id?`, `detail jsonb`, `resolution`.

### 3.7 Platform
- **regulatory_params** — dated: `accise`, `cta`, `tva`, `turpe` components, `effective_from`. Used by comparator & invoices.
- **audit_log** — append-only, hash-chained (`prev_hash`, `hash`): logins, sensitive-doc views, price/margin changes, permission changes, exports, impersonations.
- **notifications** / **message_templates** — per-master editable, variables, multilingual-ready.
- **webhook_deliveries** — Yousign/Symphonics inbound + outbound, HMAC, retry state, replayable.

---

## 4. Database schema (DDL sketch, key tables + RLS)

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE org_type AS ENUM ('OPERATOR','MASTER','SUB_REGIE','TEAM');
CREATE TYPE segment  AS ENUM ('C2','C3','C4','C5');

CREATE TABLE organizations (
  id            uuid PRIMARY KEY,                 -- v7 from app
  parent_id     uuid REFERENCES organizations(id),
  path          ltree NOT NULL,
  type          org_type NOT NULL,
  legal_name    text NOT NULL,
  siren         char(9),
  siret         char(14),
  tva           text,
  address       jsonb,
  iban_enc      bytea,                            -- KMS envelope
  logo_url      text,
  charte        jsonb,
  workflow_id   uuid,
  commission_grid_id uuid,
  margin_grid_id uuid,
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON organizations USING gist (path);

-- Example business table with org scoping
CREATE TABLE clients (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  org_path      ltree NOT NULL,
  owner_apporteur_id uuid,                        -- APPORTEUR ownership
  legal_name    text NOT NULL,
  siren         char(9),
  siret         char(14),
  naf           text,
  headcount     int,
  revenue       numeric,
  address       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON clients USING gist (org_path);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;

-- READ: descendant-or-self org; apporteurs restricted to owned rows
CREATE POLICY clients_select ON clients FOR SELECT USING (
  org_path <@ current_setting('app.org_path')::ltree
  AND (
    current_setting('app.role') <> 'APPORTEUR'
    OR owner_apporteur_id = current_setting('app.apporteur')::uuid
  )
);
-- WRITE: same scope; apporteurs write only their own
CREATE POLICY clients_write ON clients FOR ALL USING (
  org_path <@ current_setting('app.org_path')::ltree
  AND (
    current_setting('app.role') <> 'APPORTEUR'
    OR owner_apporteur_id = current_setting('app.apporteur')::uuid
  )
) WITH CHECK (
  org_path <@ current_setting('app.org_path')::ltree
);
```

The same `org_path <@ app.org_path` (+ apporteur ownership where relevant) policy pattern applies to **every** business table (sites, current_contracts, supplier_offers, client_offers, contracts, dossiers, documents, consumption_records, commission_lines, …). Shared-down tables (`message_templates`, `margin_grids` marked shared, `regulatory_params`) additionally allow read where `shared_scope @> app.org_path`.

**Audit log immutability:** `audit_log` has no UPDATE/DELETE policy (append-only); `hash = sha256(prev_hash || row_payload)`; a nightly job verifies chain integrity.

---

## 5. Auth / authz

- **AuthN:** Argon2id passwords (12+ chars, HIBP k-anonymity check, no forced rotation). MFA required for all roles except CLIENT (TOTP + WebAuthn + one-time backup codes). Invitations = signed single-use link (72h); admins never set passwords. Reset link 30 min, invalidates all sessions. Sessions: HttpOnly/Secure/SameSite=Lax cookies, rotation on login + privilege elevation, 30 min back-office inactivity / 8h absolute, revocable session list. Brute-force: per-IP + per-account rate limit, progressive lockout, new-device email alert. Optional SSO SAML/OIDC per master. Disabling a user revokes sessions/tokens immediately and forces portfolio reassignment.
- **AuthZ:** RBAC roles (table §Rights matrix) × hierarchical scope (ltree) enforced **both** in service layer (fast-fail, `resource:action`) **and** in RLS (defense in depth). Parents can restrict what children may configure (e.g. max margin, mandatory steps). **Impersonation** limited to SUPER_ADMIN / MASTER_ADMIN on their own branch: visible banner, mandatory motif, audit trace.

Full permission grid → `specs/rights-matrix.md`.

---

## 6. Commission engine (locked math)

Per active contract, per monthly period, per cadran:

```
M_unit      = final_client_price − symphonics_price      # on configurable margin base
                                                          # default base = electron + CEE + capacity
margin_amt  = Σ_cadran ( M_unit[cadran] × mwh_consumed[cadran] )
network_pool = 0.66 × margin_amt                          # Symphonics keeps 0.34 × margin_amt

# First split of the pool:
ax_tech_share = 0.50 × network_pool                       # = 0.33 × margin_amt
master_share  = 0.50 × network_pool                       # = 0.33 × margin_amt

# Master's share cascades down via commission_grids (eur_per_mwh | percent | prime),
# each parent only sees what it pays its DIRECT children:
#   master → sub_regie → team → apporteur
# Sum of downstream payouts must not exceed master_share (validation + anomaly if it does).
```

- `margin_base` is a config flag on the run (`ELECTRON` | `ELECTRON_CEE_CAP` | `ALL_IN`); default `ELECTRON_CEE_CAP`. Confirm default before go-live.
- **Clawback:** if a contract terminates early within a grid's clawback window, prior `commission_lines` accrue negative `clawback_amount` on the next run.
- All commission math is **unit-tested** (JOSH-derived fixtures + synthetic cascade fixtures). These tests block deploy.

---

## 7. Background jobs (BullMQ / Redis)

| Queue | Trigger | Work |
|---|---|---|
| `bill.ocr` | upload | pdf text extract → OCR fallback (scans) |
| `bill.extract` | ocr done | Claude structured extraction → confidence scoring |
| `pdf.generate` | offer/contract/invoice | Playwright HTML→PDF; Factur-X for invoices |
| `esign.webhook` | Yousign inbound | verify HMAC, advance dossier |
| `supplier.import` | CSV upload | parse offers / monthly consumption |
| `billing.monthlyClose` | scheduled (relançable) | reconcile → compute commissions → invoices → statements |
| `notify` | workflow transitions | email/SMS/in-app |
| `retention.purge` | scheduled | purge per retention rules, write purge proof |
| `audit.verifyChain` | nightly | hash-chain integrity check |

All writes to Symphonics/Yousign use **idempotency keys**; outbound webhooks HMAC-SHA256 + timestamp (anti-replay), exponential retry, replayable dead-letter from admin.

---

## 8. Error conventions

```json
{ "error": { "code": "OFFER_EXPIRED", "message": "…", "field": "valid_until", "traceId": "…" } }
```

- HTTP: 400 validation, 401 unauth, 403 scope/permission, 404 (also returned instead of 403 to prevent enumeration where relevant), 409 conflict/idempotency, 422 domain rule, 429 rate limit, 5xx.
- Error code taxonomy grouped by context: `AUTH_*`, `RLS_*`, `WORKFLOW_*`, `OFFER_*`, `COMMISSION_*`, `SUPPLIER_*`, `INVOICE_*`.

## 9. Observability

Structured JSON logs (no PII in clear), Sentry, metrics (queue depth, extraction confidence distribution, close duration, API health), alerts. Immutable audit log per §3.7. Daily encrypted backups, 30-day retention, monthly restore test, documented DR (RPO 24h / RTO 4h).
