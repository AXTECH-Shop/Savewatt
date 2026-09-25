# SaveWatt platform — current state and execution blueprint

_Repository and production audit: 2026-09-17_

## 1. Executive answer

SaveWatt has a credible platform foundation, but it is not yet a production CRM or a complete portal product.

The broad interface exists: internal administration, régie/commercial, back-office, finance, customer, proposal, signature, commissions, and settings routes are present. Authentication, role gates, the split public/admin access surfaces, D1 foundations, comparator math, DocuSeal webhook verification, Tremendous reservation logic, and the commission calculation engine are real.

The operational core is still incomplete. Most leads, clients, dossiers, proposals, dashboards, organization lists, settings, and customer views use demo arrays or browser `localStorage`. A proposal is therefore not yet a durable shared business record. The “PDF” is browser print, the public customer offer is hard-coded, files are not stored in R2, configuration screens are read-only demonstrations, and CRM activity tracking does not exist.

The correct next move is **not to add more screens**. It is to complete one durable, secure vertical journey:

> Admin approves a régie → régie creates a lead/client → uploads and validates a bill → enters the Symphonics price → applies an authorized margin → generates an immutable PDF → sends it to the client → client reviews/signs → back-office receives the signed dossier → every action is visible in the CRM timeline.

Once that journey works, commission settlement, finance closing, Tremendous redemption, and advanced dashboards can be layered onto trustworthy data.

## 2. Source-of-truth warning before new implementation

The local checkout and the deployed branch are not on the same commit:

- Local `main`: `3c3f095`.
- Remote `origin/main`: `96bcfa7`, four commits ahead.
- A local branch, `codex/landing-app-link`, points to `96bcfa7`.
- The working tree contains extensive unrelated modified, deleted, and untracked marketing files.
- The four remote commits contain the landing-page app link and the split `app.savewatt.fr` / `admin.savewatt.fr` access work.

Do not start feature work by blindly pulling or merging into this dirty checkout. First preserve the current marketing changes, then create a clean worktree or reconcile them deliberately. The production baseline for platform work is `origin/main` / `96bcfa7`, not local `main` / `3c3f095`.

## 3. Current production and repository status

Status terms: **Operational** is real; **Foundation** has a real seam but an incomplete journey; **Demo** uses mock/local data or disabled actions; **Missing** is not implemented.

| Capability                  | Status                             | Repository truth                                                                                         | What remains                                                                                                   |
| --------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Public website              | Operational but positionally stale | `savewatt.fr` still presents the invoice-audit/recovery offer; local marketing changes are uncommitted | Decide whether the public site sells consulting, the régie platform, or both; deploy only after that decision |
| Public app access           | Operational                        | `app.savewatt.fr/fr/sign-in` returns 200 and presents Partner vs Client                                | Production Clerk keys and real account approval operations must be confirmed                                   |
| Internal admin access       | Operational                        | `admin.savewatt.fr/fr/sign-in` returns 200 and is reserved for internal users                          | Add the actual admin CRM and approval operations behind the login                                              |
| Authentication              | Operational foundation             | Clerk identity plus D1 membership resolution; no default role from editable Clerk metadata               | Admin UI for approvals, invitations, revocation, MFA policy, and recovery procedures                           |
| Internal authorization      | Operational foundation             | Internal roles require an active D1 whitelist row                                                        | Add auditable whitelist management and emergency-access procedure                                              |
| Multi-tenant scope          | Foundation                         | D1 materialized organization paths and scoped repository checks                                          | Every business repository must enforce scope; add blocking cross-tenant isolation tests                        |
| Admin dashboard             | Demo                               | Routes and visual KPIs exist; most values come from`demo-workspace.ts`                                 | Real portfolio, lead, pipeline, conversion, activity, and health queries                                       |
| Régie portal               | Demo/foundation                    | Role-scoped shell, pipeline, team, portfolio, users, settings routes                                     | Durable organization tree, invitations, lead ownership, assignments, configurations, real dashboards           |
| Customer portal             | Demo                               | Customer and token portal routes exist; offer values/documents are hard-coded or local                   | Real dossier-bound customer identity, secure token access, documents, status, signature, messages              |
| CRM                         | Missing behind demo UI             | D1 has`clients`, `sites`, and `dossiers`; no complete CRM service or activity model                | Leads, contacts, sources, owners, tasks, notes, tags, timeline, assignment, search, filters, reporting         |
| Bill upload                 | Demo/foundation                    | Client UI validates file metadata;`/api/extract` accepts actual file bytes                             | Private R2 storage, malware checks, durable document row, queued extraction, PDF preview                       |
| Bill extraction             | Foundation                         | Gemini schema, normalization, confidence, warnings, and validation UI exist                              | Production Google authentication/runtime, R2 source, durable extraction versions, multi-supplier fixtures      |
| Current-contract validation | Demo                               | Split-view editor exists and writes to local browser storage                                             | Persist validated fields and reviewer audit event to D1                                                        |
| Symphonics offer intake     | Demo                               | Manual per-cadran entry and connector seam exist                                                         | Persist supplier offer/version, attach source sheet, confirm exact CSV format                                  |
| Comparator                  | Operational logic                  | Real`à périmètre identique` calculation and alerts                                                  | Add dedicated JOSH comparator tests, rounding/version rules, regulatory snapshots, approval gates              |
| Margin configuration        | Demo                               | Read-only grid with invented demonstration values                                                        | Versioned grids, inheritance, effective dates, min/default/max, approval threshold, enforcement                |
| Commission configuration    | Logic foundation                   | Calculation engine is tested; configuration screen is read-only                                          | Versioned downstream rules, effective dates, beneficiary resolution, vesting, clawback, close/run lifecycle    |
| Proposal builder            | Demo/foundation                    | Client-facing proposal view hides margin and buy price                                                   | Durable proposal versions, approval, legal terms, generation job, document hash and expiry                     |
| PDF generation              | Missing                            | Current “download” invokes browser print                                                               | Server-side A4 PDF via Cloudflare Browser Rendering, private R2 archive, reproducible versioning               |
| Proposal delivery           | Missing                            | No durable email/send/delivery tracking                                                                  | Email provider, sender/domain authentication, secure portal link, sent/opened/bounced timeline                 |
| E-signature                 | Foundation                         | DocuSeal submission and HMAC webhook code exists                                                         | Clean unsigned template, production secrets, signed PDF/proof retrieval to R2, end-to-end live test            |
| Back-office                 | Demo                               | Queue/check/transmit screens exist; supplier transmission is disabled                                    | Real queue, checklist, rejection/rework, packet generation, manual Symphonics acknowledgement                  |
| Symphonics integration      | Intentionally manual               | No API is assumed                                                                                        | Confirm price/consumption file formats; import/export with validation and acknowledgement                      |
| Commissions                 | Foundation/demo                    | Integer-cent engine, D1 lines/wallet tables, demo dashboard                                              | Persist grids and runs, monthly consumption input, approvals, statements, accounting controls                  |
| Tremendous                  | Foundation                         | Server-only order, reservation, rollback, idempotency, webhook code                                      | Sandbox credentials, vesting and tax policy, permissions, reconciliation, end-to-end test                      |
| Finance close / invoices    | Demo/missing                       | Finance routes are mostly disabled placeholders                                                          | Consumption import, reconciliation, close lock, Factur-X, numbering, payment status, exports                   |
| Workflows                   | Demo                               | Read-only local workflow visualization                                                                   | Versioned definitions, conditions, required documents, approvals, dossier-pinned workflow version              |
| Notifications               | Demo/missing                       | Screen shell only                                                                                        | In-app events, email/SMS preferences, templates, retries, delivery status                                      |
| Automated tests             | Too narrow                         | 5 tests pass: commission engine and webhook signatures                                                   | Repository isolation, CRM, comparator, proposal/PDF, portal, DocuSeal, migration, and E2E suites               |
| Build health                | Passing                            | ESLint and Next.js production build pass with Node 22                                                    | Add CI gates and production smoke/E2E checks                                                                   |

## 4. Product surfaces and their hard boundaries

### 4.1 Internal administration — `admin.savewatt.fr`

Only SaveWatt/AX TECH internal roles belong here:

- `SUPER_ADMIN`
- `OPERATOR_FINANCE`

This portal owns:

- Registration request approval/rejection for customers and partners.
- Master régie creation, suspension, hierarchy and limits.
- Global CRM across authorized organizations.
- Supplier configuration and import/export operations.
- Platform-wide margin ceilings and commission framework.
- Finance close, reconciliation, invoices, payouts, and audit.
- Provider/integration health, failures, replay queues, and configuration status.
- Impersonation with reason, visible banner, expiry, and audit trail.

No internal account creation link should be exposed on the public app. Internal access remains whitelist-backed and server-resolved.

### 4.2 Régie/partner portal — `app.savewatt.fr`

Roles include master régie, sub-régie, team manager, apporteur, back-office, and branch read-only users. Each actor sees only their organization branch or owned records.

This portal owns:

- Branch users, teams, invitations, and assignments.
- Leads, clients, contacts, sites, tasks, and pipeline.
- Bill/contract collection and validation.
- Symphonics price intake.
- Margin selection inside parent constraints.
- Proposal generation, approval and delivery.
- Signature status and back-office follow-up.
- Own/branch commissions and statements, without exposing ancestor margin or other apporteurs.
- Branch branding, templates, workflow, and allowed commission distribution.

### 4.3 Customer portal — `app.savewatt.fr`

Customer accounts and secure invitation links stay on the public app domain, not the internal admin domain.

The customer may see only:

- Their legal entity, sites, and dossier.
- Final offered prices, duration, validity, savings assumptions, and legal documents.
- Requested document checklist and upload status.
- Signature flow and post-signature status.
- Messages and action requests relevant to that dossier.

The customer must never receive or infer:

- Symphonics buy prices.
- Margin values or margin grids.
- Commission rules or beneficiaries.
- Other customers, régies, internal notes, review comments, or audit data.

## 5. Production MVP for the first 100 manually processed deals

The MVP should finish the sale-to-signature journey without waiting for a Symphonics API or full automated finance close.

### Included

1. Admin approves and creates partner/customer access.
2. Admin or régie creates a lead, assigns an owner, records source and next action.
3. Régie converts the lead into a client, contact, site, and dossier without duplicating data.
4. Régie uploads bills/contracts into private R2 storage.
5. Extraction runs when configured; manual entry always remains available.
6. A human validates extracted current-contract data.
7. Régie uploads or manually enters the Symphonics proposal.
8. The platform resolves the applicable margin grid and approval rule.
9. The comparator creates a versioned result from immutable input snapshots.
10. Authorized staff approve and generate a branded, immutable PDF.
11. The platform sends a secure client link and records delivery status.
12. The client reviews, supplies requested documents, and signs through DocuSeal.
13. The signed PDF and proof are archived to R2; the webhook advances the dossier.
14. Back-office validates and exports a controlled transmission package for Symphonics.
15. Admin and the owning régie see the entire activity timeline and next action.
16. A commission forecast is captured from the same immutable offer snapshot.

### Deferred from the first production release

- Live Symphonics API and automated consumption ingestion without a stable CSV.
- Factur-X transmission, automated payouts, and Tremendous production redemption.
- Multiple suppliers, gas comparison, dedicated white-label instances, and BYOC.

## 6. CRM requirements

Do not build a separate generic CRM beside dossiers. Use one connected commercial model so the pipeline, proposal, contract, and commissions share identity and history.

### 6.1 Core records

| Record              | Required fields and behavior                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lead                | Organization scope, company name, contact, email/phone, source, campaign/referrer, owner, stage, estimated volume/value, next action, due date, loss reason |
| Client              | Legal name, SIREN/SIRET, address, billing/contact roles, status, source lead, consent/legal basis                                                           |
| Contact             | Name, function, email, phone, signer flag, preferred channel                                                                                                |
| Site                | Address, PDL/PRM, segment, power, meter/contract attributes, active dossier                                                                                 |
| Dossier/opportunity | Owner, branch, pipeline stage, probability, supplier, expected start, next action, workflow version, loss/win reason                                        |
| Activity            | Call, email, meeting, note, upload, configuration decision, approval, send/open/sign/status event                                                           |
| Task                | Assignee, due date, priority, type, relation to lead/client/dossier, completion result                                                                      |
| Tag/list            | Scoped tags for targeting and filtering; no authorization semantics                                                                                         |

### 6.2 Pipeline

Recommended stages:

`NEW_LEAD → QUALIFIED → DOCUMENTS_REQUESTED → BILL_RECEIVED → ANALYSIS_VALIDATED → SUPPLIER_PRICE_REQUESTED → SUPPLIER_OFFER_RECEIVED → OFFER_DRAFT → APPROVAL_REQUIRED → READY_TO_SEND → SENT → VIEWED → SIGNED → BACKOFFICE_CHECK → TRANSMITTED → ACCEPTED → ACTIVE`

Terminal stages require a reason: `LOST`, `DECLINED`, `EXPIRED`, `CANCELLED`.

Stages must be server-controlled transitions, not arbitrary strings written by the browser. Each transition writes an audit and CRM activity event.

### 6.3 Admin CRM views

- Global pipeline with filters for master, sub-régie, owner, stage, source, supplier, segment, date, and overdue next action.
- Lead inbox and unassigned queue.
- Lead detail with timeline, tasks, documents, contacts, sites, offers, and audit reference.
- Assignment/reassignment with scope validation.
- Duplicate detection by SIREN, email, phone, and PDL.
- Conversion and aging reports by source, régie, user, and stage.
- Lost reason and no-activity reporting.
- CSV export that respects permissions and masks sensitive fields.

## 7. Proposal, PDF, delivery, and signature

### 7.1 Proposal creation state machine

1. Validate client/site/current contract.
2. Validate supplier proposal and validity date.
3. Resolve the effective margin grid for the dossier organization and date.
4. Apply default margin or authorized override.
5. Require supervisor approval if outside automatic bounds.
6. Run comparison and blocking/sanity rules.
7. Snapshot all calculation inputs, config versions, results, and legal copy.
8. Create immutable offer version `v1`, `v2`, etc.
9. Generate and hash the PDF.
10. Send the selected version; later edits create a new version and never mutate what was sent.

### 7.2 PDF requirements

- Server-generated A4 PDF using Cloudflare Browser Rendering/Puppeteer or a dedicated render service.
- SaveWatt/AX TECH identity and verified legal identifiers.
- Customer, site, PDL, term, validity, final prices, comparison basis, assumptions, exclusions, savings, and acceptance/signature section.
- No supplier buy price, internal margin, commission, internal comments, or hidden DOM data.
- Reproducible from its stored snapshot and template version.
- SHA-256 hash, generated timestamp, generator/template version, and immutable R2 object.
- Previewed in the app and downloadable only through an authorized short-lived URL.
- Automatic expiration no later than the underlying Symphonics proposal.

### 7.3 Delivery requirements

- Transactional email provider and authenticated sending domain.
- Email template version and sender identity stored with each delivery.
- Opaque expiring link to one offer version.
- States: queued, sent, delivered, bounced, viewed, expired, revoked, superseded.
- Resend does not create a duplicate proposal; it creates another delivery attempt.
- Every delivery and portal view is added to the activity timeline.

### 7.4 DocuSeal completion

The existing signed customer contract must not be reused as a template. Obtain a clean unsigned Symphonics master and approve its field mapping.

Complete the flow by:

- Uploading the sanitized private template.
- Mapping client/signer/offer variables.
- Keeping webhook completion authoritative.
- Fetching the signed PDF and proof/audit artifact after completion.
- Storing both privately in R2 for the approved retention period.
- Testing decline, expiry, duplicate webhook, wrong signer, provider outage, and replay.

## 8. Configuration model

All financial and workflow configuration must be versioned and effective-dated. A sent offer and a closed commission run point to exact immutable versions.

### 8.1 Supplier and rate configuration

- Supplier and product.
- Segment and eligible contract terms.
- Per-cadran electron price, CEE, capacity, subscription, forecast volume.
- Proposal validity and supply dates.
- Current regulatory values used for display/calculation: TURPE, accise, CTA, TVA.
- Units, rounding, tax inclusion/exclusion, and source document.
- CSV mapping profiles for Symphonics imports.

Supplier prices are deal-specific input in v1. Regulatory/reference rates are admin configuration.

### 8.2 Margin configuration

- Scope: platform, master, sub-régie, team, optionally segment/product.
- Effective start/end.
- Per-cadran or global mode.
- Minimum, default, maximum.
- Automatic approval range and supervisor override range.
- Margin base definition.
- Parent ceiling and child inheritance rule.
- Reason required for override.

### 8.3 Commission configuration

Locked framework unless contractually changed:

- Network pool: 66% of eligible margin.
- AX TECH: 50% of the network pool.
- Master pool: 50% of the network pool.

Configurable descendants:

- Percentage of parent/master pool.
- EUR/MWh component.
- Signing prime.
- Cap/floor.
- Vesting trigger and delay.
- Clawback window/method.
- Effective dates and eligible contracts/products.
- Direct-child visibility only.
- Sum validation so descendants never exceed the available parent pool.

### 8.4 Other configuration

- Workflow versions and required-document rules.
- Proposal/contract/email templates.
- Branch branding and sender identity.
- Notification preferences and escalation SLAs.
- Portal-link lifetimes.
- Retention/purge policies.
- Gift redemption minimum, denominations, vesting, and tax policy.
- Provider health/configuration status without exposing secrets.

## 9. Required data and backend work

Evolve the existing D1 schema rather than creating a second data model. Add migrations and repositories for:

- Lead sources, leads, contacts, activities, tasks, notes, tags, assignments.
- Organization invitations, limits, branding/config references, and hierarchy management.
- Bill uploads, extraction runs, extraction versions, validation decisions.
- Supplier offer versions and line items.
- Margin grids/versions/rules and approval decisions.
- Commission grid versions/rules, runs, and immutable calculation snapshots.
- Offer versions, offer line snapshots, approval status, PDF document, and expiry.
- Portal tokens, delivery attempts, messages, and customer acknowledgements.
- Workflow definitions, versions, instances, transitions, and required documents.
- Transmission packages and supplier acknowledgements.
- Regulatory parameter versions.

Repository rules:

1. Resolve the actor from authenticated identity plus active D1 membership.
2. Never accept organization scope from the browser as authority.
3. Apply materialized-path/owner predicates to every read and mutation.
4. Return 404 for inaccessible identifiers to prevent enumeration.
5. Wrap money in integer cents and energy quantities in explicit units.
6. Use idempotency keys for send, render, signature, import, close, and payout actions.
7. Write audit/activity events in the same logical operation as the mutation.
8. Remove `localStorage` from every production business journey.

## 10. Delivery sequence

### Phase 0 — Baseline and decisions

**Tasks**

- Start from remote `origin/main` in a clean worktree; preserve the current dirty marketing tree.
- Reconcile architecture documents: D1/Cloudflare is the implemented choice, while parts of `backend-specs.md` still describe PostgreSQL/RLS.
- Freeze the first-production-release scope in this document.
- Confirm the critical inputs in section 12.
- Add CI for lint, build, tests, migration validation, and preview smoke checks.

**Exit**

- One clean implementation branch, one agreed architecture, no ambiguous database/auth/signature provider choice.

### Phase 1 — Durable identity, organization tree, CRM, and dossier backbone

**Tasks**

- Admin registration-request queue and approve/reject/invite operations.
- Durable master/sub-régie/team/apporteur creation and membership administration.
- CRM schema, services, scoped repositories, APIs, and admin/régie screens.
- Real clients/sites/dossiers, activities, tasks, ownership and pipeline transitions.
- Replace demo arrays/local storage on dashboard, pipeline, client, organization, and user screens.
- Blocking cross-tenant, sibling-branch, owner-only, and internal-role tests.

**Exit**

- Two test régies cannot read or mutate each other's records; a lead can be created, assigned, converted, and tracked entirely in D1.

### Phase 2 — Documents, extraction, supplier intake, and proposal engine

**Tasks**

- R2 binding, private object service, upload limits, MIME sniffing, hashing, malware/quarantine seam.
- Durable extraction jobs/results and human validation.
- Resolve production Gemini runtime/authentication from Cloudflare; do not depend on a developer's local ADC session.
- Manual Symphonics offer intake with source attachment and optional validated CSV import.
- Margin grid resolution, inheritance, overrides, and approval workflow.
- Comparator tests against JOSH and additional EDF/TotalEnergies/Engie fixtures.
- Immutable offer calculation snapshots.

**Exit**

- A non-demo dossier can move from uploaded private bill to approved, reproducible offer inputs with no browser-only data.

### Phase 3 — PDF, client delivery, customer portal, and signature

**Tasks**

- Versioned document templates and A4 render route/job.
- R2 archive, hash, download authorization, preview, expiry.
- Email delivery provider, portal token model, delivery timeline.
- Real customer portal bound to customer/dossier/offer version.
- Clean DocuSeal template, webhook-to-dossier transition, signed PDF/proof archival.
- Back-office checklist and rework path.

**Exit**

- A real test customer receives a real email, sees only their exact offer, downloads the new PDF, signs it, and the signed artifacts/status appear for the authorized régie and admin.

### Phase 4 — Configurable régie operations

**Tasks**

- Writable versioned margin, commission, workflow, template, branding, and notification settings.
- Parent limits and child inheritance.
- Team/user invitations and reassignment.
- Branch dashboards from production queries.
- Renewal échéancier and automatic tasks.

**Exit**

- An admin can create a master régie with limits; that régie can operate independently within those limits without seeing another branch.

### Phase 5 — Finance and commission close

**Tasks**

- Validated Symphonics monthly consumption import.
- Contract reconciliation and anomaly resolution.
- Immutable commission run using the contract's snapshotted rules.
- Approval, vesting, statements, clawbacks, wallet credits.
- Consolidated AX TECH invoicing, Factur-X validation, numbering, payments, exports.
- Tremendous sandbox then production reconciliation.

**Exit**

- A month closes from supplier input to reconciled contract lines, validated commissions, invoice/statement artifacts, and balanced ledgers.

### Phase 6 — Production hardening

**Tasks**

- Complete audit, retention/purge, backup/restore, incident, and provider-failure runbooks.
- Add rate limiting, security headers, secret rotation, upload scanning, dependency/SBOM, accessibility, mobile E2E, and load/backpressure gates.
- Complete an external penetration test before financial production use.

**Exit**

- Security, recovery, privacy, and operational evidence exists—not just passing feature demos.

## 11. Blocking acceptance tests

The following must gate deployment:

- User in master A cannot list, search, infer, export, or mutate master B data.
- Apporteur sees only owned dossiers unless explicitly assigned broader scope.
- Customer/token can access one dossier and cannot enumerate another token or ID.
- Internal roles cannot sign up from the public admin surface and require whitelist access.
- JOSH comparator reproduces the approved values and alerts within defined rounding tolerance.
- Margin override cannot bypass parent limits or approval.
- Sent PDF contains final client prices but no buy price, margin, commission, or internal note.
- Regenerating the same immutable offer version produces equivalent content and preserves its hash/version record.
- Expired/superseded proposal links fail closed.
- Duplicate DocuSeal, delivery, import, close, and Tremendous events are idempotent.
- Signed artifacts are private and accessible only through authorized short-lived downloads.
- Commission descendants never exceed the master pool; ledger/run totals balance exactly in cents.
- Production core journeys do not depend on `localStorage` or demo arrays.
- Backup restore and migration rollback are rehearsed before financial go-live.

## 12. Decisions and external inputs still required

| Decision/input                                             | Why it matters                              | Owner                    | Needed by                     |
| ---------------------------------------------------------- | ------------------------------------------- | ------------------------ | ----------------------------- |
| Exact Symphonics price-sheet columns and sample blank file | Supplier offer import and validation        | Symphonics + AX TECH     | Phase 2                       |
| Exact monthly consumption file                             | Reconciliation and commission close         | Symphonics + AX TECH     | Phase 5                       |
| Margin base                                                | Offer/commission calculation                | AX TECH finance          | Before real proposal approval |
| Default margin bounds by segment/cadran                    | Prevents arbitrary commercial pricing       | AX TECH commercial       | Phase 2                       |
| Downstream commission defaults                             | Makes configuration and forecast meaningful | AX TECH + master régies | Phase 4/5                     |
| Vesting, clawback, Tremendous minimum, and tax handling    | Prevents invalid payouts                    | AX TECH finance/legal    | Phase 5                       |
| Clean unsigned Symphonics contract master                  | Required for DocuSeal                       | Symphonics + AX TECH     | Phase 3                       |
| DocuSeal EU Cloud vs EU self-hosted                        | Data processing and operations              | AX TECH                  | Phase 3                       |
| Transactional email provider and sender domain             | Proposal delivery and traceability          | AX TECH                  | Phase 3                       |
| Customer access model after signature                      | Account lifecycle and support               | Product owner            | Phase 3                       |
| Document retention and ID/RIB requirements                 | Workflow and RGPD minimization              | Legal + Symphonics       | Phase 3                       |
| Factur-X issuing details and approved platform             | Legal invoicing                             | AX TECH finance          | Phase 5                       |

Work can proceed through Phase 1 without most of these. Do not invent commercial or legal values inside the product.

## 13. Immediate next implementation slice

The next slice should be **Durable CRM + dossier backbone**, not commissions or visual polish.

Create one vertical implementation branch from `origin/main` and deliver:

1. Migrations for leads, contacts, activities, tasks, dossier stage history, and organization invitations/limits.
2. Scoped repositories and service-layer authorization.
3. Admin registration-request queue and partner approval.
4. Admin global lead pipeline and lead detail timeline.
5. Régie branch pipeline and lead/client creation.
6. Lead conversion into client/site/dossier.
7. Replace local storage in the new-proposal and core dossier pages.
8. Isolation and transition tests plus one Playwright E2E journey.

That slice creates the stable spine every later feature needs: uploaded files, proposals, customer access, PDFs, signature, commission forecasting, and admin reporting.

## 14. Definition of “ready for real clients”

SaveWatt is ready for controlled real-client use only when all of these are true:

- A real admin can approve and manage real partner/customer access without database CLI work.
- A real régie can complete the full dossier journey without demo data or browser-only persistence.
- The new PDF is server-generated, versioned, private, and deliverable through a tracked secure link.
- A real client can review and sign while seeing no internal commercial data.
- Signed documents and proof are archived and recoverable.
- Admin CRM shows source, owner, history, next action, status, and documents for every lead/dossier.
- Margin and commission configuration is versioned, scoped, validated, and auditable.
- Tenant isolation, proposal secrecy, webhook idempotency, and core calculations are covered by blocking tests.
- Provider outages fail visibly and safely; no screen reports a success that did not happen.
- Production keys, backup/restore, monitoring, privacy text, and operator runbooks are complete.

Until then, the platform should be described as a production-oriented foundation with demo business workflows—not as a finished CRM or client portal.
