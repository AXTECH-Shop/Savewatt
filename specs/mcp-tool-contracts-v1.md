# SaveWatt MCP — Tool Contracts v1

Last updated: 2026-09-25. Server: `savewatt-mcp` (Cloudflare Worker), `POST /mcp`, JSON-RPC 2.0, protocol `2025-06-18`.

All tools are namespaced `domain.verb`. Responses use the MCP envelope:
`{ content: [{ type: "text", text }], structuredContent }` on success,
`{ content: [...], isError: true }` on failure (see mcp-auth-and-scopes.md for the error vocabulary).
`tools/list` exposes `inputSchema`, `annotations.readOnlyHint`, and
`_meta = { status, requiredScopes, requiredRoles }` for every tool.

## Live tools (19)

### dossiers.list (readOnly)
Args: `{ status?: "draft"|"uploaded"|"analyzed"|"proposalReady"|"sent"|"signed"|"lost" }`
→ `{ dossiers: DossierSummary[], count }`. Scopes: `dossiers:read`.

### dossiers.get (readOnly)
Args: `{ dossierId }` → `{ dossier }`. Scopes: `dossiers:read`.

### dossiers.create
Args: `{ legalName, segment: "C2"|"C3"|"C4"|"C5", siren?, contactName?, contactEmail?, contactPhone?, pdl?, source?, notes? }`
→ `{ dossier }`. Lead + convert flow (creates client, site, dossier) — same service as the UI. Scopes: `dossiers:write`.

### dossiers.transition_stage
Args: `{ dossierId, status, version? }` (version fetched when omitted; optimistic check + platform transition rules)
→ `{ dossier }`. Scopes: `dossiers:write`.

### dossiers.attach_document
Args: `{ dossierId, kind: "BILL"|"CURRENT_CONTRACT"|"SUPPLIER_OFFER", fileName, mimeType, contentBase64 }`
Rules: ≤ 10 MB decoded, MIME ∈ pdf/png/jpeg/webp, magic-byte checked, safe filename.
→ `{ document (AVAILABLE), r2Key, sha256 }`. Scopes: `dossiers:write`.

### bills.extract
Args: `{ documentId }` → `{ extraction, warnings }`.
Runs Gemini (Vertex AI, EU) via the platform's extraction module; provider
errors (quota, missing GCP_WIF_PRIVATE_KEY on the worker) surface as clean
`isError` results. Scopes: `bills:extract`.

### bills.extraction_status (readOnly)
Args: `{ documentId }` or `{ extractionId }` → `{ extractions, count }` | `{ extraction }`. Scopes: `bills:read`.

### bills.validate
Args: `{ extractionId, bill, fieldConfidence?, overallConfidence?, warnings? }`
→ `{ extraction }` (status VALIDATED; the offer engine consumes the latest VALIDATED extraction). Scopes: `bills:write`.

### supplier_offers.create_manual
Args: `{ dossierId, termYears (1–6), ceeEurMwh, capacityEurMwh, subscriptionEurMonth, validUntil?, sourceDocumentId?, lines: [{ cadran, electronEurMwh, annualVolumeMwh }] }`
→ `{ supplierOffer }`. Scopes: `offers:write`.

### comparisons.run (readOnly)
Args: `{ dossierId, marginEurMwh? }`
→ `{ comparison, budgetPreview, marginEurMwh, clientPriceLines }` — nothing persisted. Scopes: `offers:read`.

### client_offers.create
Args: `{ dossierId, marginEurMwh?, marginOverrideReason? }`
→ `{ offerVersion }` (immutable, includes `budget` prévisionnel snapshot; out-of-grid margins → `APPROVAL_REQUIRED`). Scopes: `offers:write`.

### client_offers.generate_pdf
Args: `{ offerVersionId }`
→ `{ offerVersionId, budgetR2Key, budgetSha256, marketingR2Key, marketingSha256 }`.
Both PDFs rendered via Browser Rendering and archived in R2 (idempotent — existing artifacts are reused). Scopes: `offers:write`.

### client_offers.send
Args: `{ offerVersionId, idempotencyKey (≥ 8 chars), recipientEmail? }`
→ sent: `{ sent: true, deliveryId, providerMessageId, recipientEmail }`;
no key configured: `{ sent: false, skipped: "RESEND_API_KEY_MISSING", ...pdfKeys }`;
replay of an idempotency key: `{ replayed: true, deliveryId, state }`.
Version must be `DRAFT` or `APPROVED`; marks it `SENT` and writes the dossier event. Scopes: `offers:write`.

### organizations.create_master
Args: `{ name, parentId? (default: token org), kind? (default MASTER), maxChildOrganizations? }`
→ `{ organization }` (hierarchy policy enforced by AccessScopePolicy). Scopes: `admin:write`.

### margin_grids.create_version
Args: `{ minMarginEurMwh, defaultMarginEurMwh, maxMarginEurMwh, roleScope?: "ADMIN"|"REGIE", effectiveFrom?, effectiveTo? }`
→ `{ marginGrid }`. REGIE max ≤ effective ADMIN max (repository-enforced). Scopes: `admin:write`.

### pricing_parameters.create_version
Args: `{ ceeEurMwh, capacityEurMwh, acciseEurMwh, ctaRate, tvaRate, turpeFixed: { gestionCentsPerDay, comptageCentsPerDay, soutirageFixeCentsPerKwPerDay }, turpeVariable: { HPH, HCH, HPE, HCE }, effectiveFrom?, effectiveTo? }`
→ `{ pricingParameters }` (new ACTIVE version; previous superseded; audit_events row written by the repository). Scopes: `admin:write`.

### audit.search (readOnly)
Args: `{ action?, resourceType?, resourceId?, organizationId?, sinceSeconds?, untilSeconds?, limit? (≤ 200, default 50) }`
→ `{ events, count }`. Roles: `SUPER_ADMIN` (all orgs) and `OPERATOR_FINANCE` (own org only). Scopes: `audit:read`.

### leads.list (readOnly)
Args: `{ status?: "NEW"|"QUALIFIED"|"CONVERTING"|"CONVERTED"|"LOST" }` → `{ leads, count }`. Scopes: `leads:read`.

### leads.create
Args: `{ legalName, siren?, contactName?, contactEmail?, contactPhone?, pdl?, segment?, source?, notes? }` → `{ lead }`. Scopes: `leads:write`.

## Planned tools (listed, never callable)

`commission_grids.create_version`, `commission_grids.publish_version`,
`commission_grids.get_effective`, `impersonation.start`, `impersonation.stop`,
`reports.pipeline_summary`, `reports.integration_health`, `signatures.status`,
`client_offers.send_for_signature`, `wallet.redeem`, `wallet.balance`,
`registration_requests.list`, `registration_requests.approve`,
`registration_requests.reject`, `organizations.create_branch_node`,
`memberships.invite`, `memberships.update_role`, `clients.create`,
`sites.create`.

Promotion rule (spec §15): a planned tool goes live only when its backing
service is durable in D1, policy-enforced, and covered by a contract test.
