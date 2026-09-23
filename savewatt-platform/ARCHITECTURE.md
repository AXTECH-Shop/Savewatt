# SaveWatt platform architecture

## Runtime boundaries

- `src/app/[locale]/(auth)`: public Clerk authentication surfaces without the workspace shell.
- `src/app/[locale]/(app)`: authenticated workspace. Nested route groups apply server-side role gates.
- `src/app/api`: authenticated integration routes. The DocuSeal webhook is token-authenticated and public only to the provider.
- `src/components/ui`: reusable visual primitives.
- `src/components/workspace`: role-aware operational patterns.
- `src/lib`: domain types, access control, durable CRM/documents, extraction, comparison, commissions, and the isolated demo adapter.

## Identity and access

Clerk supplies verified identity only. D1 memberships map the Clerk user ID to the SaveWatt role and materialized organization tree. Internal roles additionally require an active email, role, and organization match in `internal_user_whitelist`; a matching entry provisions the Clerk user and active membership on first login. Branch invitations are email-bound, expire after seven days, and activate only when Clerk returns the same verified address. Suspending any organization denies access throughout its descendant path. Server layouts call `resolveServerActor` or `requirePageRole`; client navigation is presentational and never the authorization boundary. Repository queries enforce the same materialized-path scope because D1 does not provide PostgreSQL-style RLS.

## Data and integrations

Browser `localStorage` is a transparent demo adapter, not the production repository. Cloudflare D1 is the transactional store for leads, clients, dossiers, activity, tasks, access decisions, and organization configuration. Materialized paths plus repository predicates enforce tenant scope because D1 has no PostgreSQL-style RLS. Private R2 objects store bills, current contracts, and supplier offers; authenticated APIs validate content and tenant scope before upload/download. Gemini extraction uses ADC. DocuSeal browser events are UI hints only; HMAC-verified provider webhooks drive D1 signature state. Tremendous rewards are issued only by a SaveWatt super administrator, attached to the recipient wallet for visibility, and use `external_id` for idempotency. A partner cannot issue or redeem a reward. A customer may select bill reduction or gift card, but only the administration chooses and invokes the gift provider.

## Cloudflare deployment

OpenNext adapts the existing Next.js application to Workers. `wrangler.jsonc` declares the `DB` D1 binding and private `DOCUMENTS` R2 binding; `migrations/` is the only schema source. Integration secrets are Worker secrets or ignored local environment values; they are never public variables. Cloudflare context access is isolated behind server-only managers and repository instances are created inside requests or server rendering, never during module evaluation.

## Integration boundaries

- DocuSeal: private template, per-signer submission, email 2FA, HMAC-verified webhooks, durable provider IDs rather than expiring document URLs.
- Tremendous: Bearer-authenticated server-only client, admin-only issuance, recipient-wallet history, provider `external_id` idempotency, and HMAC-verified webhook inbox.
- Symphonics: manual supplier offer remains the current source; no supplier API is assumed.

## Financial invariants

The commission engine calculates in integer cents. Symphonics retains 34% of margin; 66% enters the network pool; AX TECH and the master régie each receive 50% of that pool before any configurable downstream cascade. A cascade cannot exceed the master pool.
