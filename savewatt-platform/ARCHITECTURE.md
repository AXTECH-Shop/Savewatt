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

Browser `localStorage` is a transparent demo adapter, not the production repository. The durable target is R2 for documents and either D1 or Postgres via Hyperdrive for transactional data. Gemini extraction uses ADC. DocuSeal client events are UI hints only; verified provider webhooks must drive the signed state and archive signed PDFs/audit trails through the durable completion worker.

## Financial invariants

The commission engine calculates in integer cents. Symphonics retains 34% of margin; 66% enters the network pool; AX TECH and the master régie each receive 50% of that pool before any configurable downstream cascade. A cascade cannot exceed the master pool.
