# Savewatt — API Documentation

> REST, versioned `/api/v1`, JSON. Auth = session cookie (app) or OAuth2 client-credentials (future Symphonics/partner). Every route enforces `rights-matrix.md` in service layer + RLS. Entities per `backend-specs.md`. Routes here are the contract for `frontend-specs.md`.

## Conventions

- **Base:** `/api/v1`. **IDs:** UUID v7. **Pagination:** cursor (`?limit=&cursor=`), responses include `nextCursor`.
- **Auth:** `HttpOnly` session cookie + CSRF token header for mutations. Partner/machine access (deferred): `Authorization: Bearer <oauth2 token>` with scopes.
- **Idempotency:** `Idempotency-Key` header required on all external-writing POSTs (transmit, invoice, sign).
- **Error envelope:** `{ "error": { "code", "message", "field?", "traceId" } }` (codes per backend §8).
- **Filtering:** list endpoints accept scope-safe filters; server ignores any filter that would widen RLS scope.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | → MFA challenge token |
| POST | `/auth/mfa/verify` | TOTP/WebAuthn/backup |
| POST | `/auth/mfa/enroll` | returns TOTP secret / WebAuthn options + backup codes |
| POST | `/auth/invitations/accept` | body: token, password (HIBP-checked) |
| POST | `/auth/reset` / `/auth/reset/confirm` | identical response regardless of account existence |
| GET/DELETE | `/me/sessions` / `/me/sessions/{id}` | list / revoke |
| POST | `/impersonation` / DELETE `/impersonation` | SUPER_ADMIN/MASTER_ADMIN; body: targetUserId, motif |

## Organizations & users
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/organizations` | list (SELF+DESC) / create sub-node or master |
| PATCH | `/organizations/{id}` | update; `/branding` sub-resource for logo/charte/domain |
| GET/POST | `/invitations` | list / send signed invite |
| PATCH | `/memberships/{id}` | role/permission_set; disable → triggers portfolio reassignment |
| GET/PUT | `/permission-sets` | custom roles |

## Settings (grids, workflows, templates, regulatory)
| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/margin-grids` | bounded by parent limits |
| GET/PUT | `/commission-grids` | per direct-child level; €/MWh|%|prime; clawback |
| GET/POST/PUT | `/workflows` | versioned; existing dossiers pinned to their version |
| GET/PUT | `/templates` | offer/contract/SEPA/statement/invoice |
| GET/POST | `/regulatory-params` | dated accise/CTA/TVA/TURPE |
| PUT | `/suppliers/symphonics` | connector config + CSV mappings |

## CRM
| Method | Path | Notes |
|---|---|---|
| GET | `/lookup/sirene?q=` | INSEE proxy |
| GET/POST | `/clients` / `/clients/{id}` | APPORTEUR scope = OWNED |
| POST | `/sites` , GET `/sites/{id}/current-contract` | PDL/PRM 14-digit validation |
| POST/PATCH | `/current-contracts` | |

## Bills & extraction
| Method | Path | Notes |
|---|---|---|
| POST | `/bills` | multipart; kicks AV→OCR→extract jobs |
| GET | `/bills/{id}` , `/bills/{id}/extraction` | status + fields+confidence |
| PATCH | `/bills/{id}/validate` | human validation; body: corrected fields |

## Offers & comparator
| Method | Path | Notes |
|---|---|---|
| POST | `/supplier-offers/import` | CSV/Excel/PDF via connector |
| POST | `/compare` | body: currentContract + supplierOffer + marginBase → per-cadran result + alerts (JOSH fixture) |
| GET/POST | `/client-offers` | margin bounded by grid; validity ≤ supplier |
| POST | `/client-offers/{id}/send` | creates Yousign request + portal link |

## Dossiers & workflow
| Method | Path | Notes |
|---|---|---|
| GET | `/dossiers` | filters: scope(owned/team), stage, segment, échéance |
| PATCH | `/dossiers/{id}/assign` | reassign within team |
| POST | `/dossiers/{id}/transition` | stage move; motif required where configured |
| PATCH | `/documents/{id}/verify` | back-office doc check |
| POST | `/contracts/{id}/transmit` | Idempotency-Key; v1 export+ack |

## Portal (CLIENT, token-scoped)
| Method | Path | Notes |
|---|---|---|
| GET | `/portal/offer/{token}` | offer + comparator (no buy price/margin) |
| POST | `/portal/documents` | RIB(IBAN/BIC check)/ID/KBIS/POA if workflow requires |
| POST | `/portal/sign` | Yousign OTP |

## Billing, commissions, finance
| Method | Path | Notes |
|---|---|---|
| POST | `/consumption/import` | monthly Symphonics CSV; preview then commit |
| POST | `/billing/close` | run/relaunch monthly close |
| GET | `/commission-runs/{id}` | step status, anomalies count |
| GET | `/commissions?scope=owned|branch` | lines; APPORTEUR = owned only |
| GET/PATCH | `/reconciliation-anomalies` | resolve |
| GET/POST | `/invoices` | consolidated Factur-X; continuous numbering |
| GET | `/exports/fec` | FEC-compatible CSV |

## Reporting & platform
| Method | Path | Notes |
|---|---|---|
| GET | `/reports/operator|portfolio|team` | dashboards |
| GET | `/echeancier` | renewals + alerts |
| GET | `/audit-log` | scoped; immutable |
| GET | `/health` | queues, connectors, DB |

## Webhooks (inbound)
| Source | Path | Verify |
|---|---|---|
| Yousign | `/webhooks/yousign` | HMAC; events: signature_request.done/declined/expired, signer.done |
| Symphonics (future) | `/webhooks/symphonics` | HMAC-SHA256 + timestamp anti-replay; deferred in v1 |
