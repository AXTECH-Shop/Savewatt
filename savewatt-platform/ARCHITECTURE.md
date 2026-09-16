# SaveWatt platform architecture

## Runtime boundaries

- `src/app/[locale]/(auth)`: public Clerk authentication surfaces without the workspace shell.
- `src/app/[locale]/(app)`: authenticated workspace. Nested route groups apply server-side role gates.
- `src/app/api`: authenticated integration routes. The DocuSeal webhook is token-authenticated and public only to the provider.
- `src/components/ui`: reusable visual primitives.
- `src/components/workspace`: role-aware operational patterns.
- `src/lib`: domain types, access control, extraction, comparison, commissions, and temporary browser persistence.

## Identity and access

Clerk supplies identity. `publicMetadata.savewattRole`, `orgPath`, and `orgName` map the user to the SaveWatt role model. Server layouts call `requirePageRole`; client navigation is presentational and never the authorization boundary. Production data queries must enforce the same materialized-path scope and database RLS when Postgres is selected.

## Data and integrations

Browser `localStorage` is a transparent demo adapter, not the production repository. Cloudflare D1 is the selected transactional store; materialized paths plus repository predicates enforce tenant scope because D1 has no PostgreSQL-style RLS. R2 remains the document target. Gemini extraction uses ADC. DocuSeal browser events are UI hints only; HMAC-verified provider webhooks drive D1 signature state. Giftogram orders reserve wallet credits before provider calls and use `external_id` for idempotency.

## Cloudflare deployment

OpenNext adapts the existing Next.js application to Workers. `wrangler.jsonc` declares the `DB` D1 binding and `migrations/` is the only schema source. Integration secrets are Worker secrets or ignored local environment values; they are never public variables. `getCloudflareContext()` is isolated behind `DatabaseManager` so provider repositories remain server-only.

## Integration boundaries

- DocuSeal: private template, per-signer submission, email 2FA, HMAC-verified webhooks, durable provider IDs rather than expiring document URLs.
- Giftogram: authenticated server-only client, campaign configured outside the browser, D1 wallet reservation, provider idempotency key, HMAC-verified webhook inbox.
- Symphonics: manual supplier offer remains the current source; no supplier API is assumed.

## Financial invariants

The commission engine calculates in integer cents. Symphonics retains 34% of margin; 66% enters the network pool; AX TECH and the master régie each receive 50% of that pool before any configurable downstream cascade. A cascade cannot exceed the master pool.
