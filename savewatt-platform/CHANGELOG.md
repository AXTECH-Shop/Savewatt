# Changelog

## 2026-09-19 — Account approval and organization hierarchy

- Added durable organization status/limits, membership versions, and expiring organization invitations.
- Added branch-scoped organization creation, suspension, member suspension/reactivation, and invitation APIs with parent-limit and role-level enforcement.
- Added a super-admin access console for partner/customer registration decisions and internal operator/finance allowlist management.
- Added verified-email invitation activation, optimistic concurrency, audit events, and ancestor-suspension enforcement across descendant logins.
- Replaced the organization and branch-user demo screens with operational D1-backed management surfaces while retaining an explicit non-mutating preview mode.

## 2026-09-19 — Private dossier documents

- Added a private Cloudflare R2 binding and durable document lifecycle for bills, current contracts, and supplier offers.
- Added authenticated, tenant-scoped upload, listing, and download APIs with 10 MB limits, MIME and magic-byte checks, SHA-256 metadata, safe filenames, and no-store downloads.
- Connected real dossier creation and dossier detail screens to private document storage while retaining the explicitly marked demo path.
- Added compensating object cleanup, document validation tests, and bilingual upload states without changing DocuSeal, signing, or proposal delivery.

## 2026-09-18 — Durable CRM foundation

- Added the first durable CRM migration with leads, dossier activity events, tasks, and optimistic record versions.
- Added fail-closed organization-path and owner-scoped CRM repositories for lead creation/conversion, dossier queries/status changes, timelines, and tasks.
- Added authenticated CRM APIs for leads, atomic lead conversion, dossiers, activity, and task state.
- Added validation, authorization, and dossier state-machine regression tests without changing DocuSeal or signing behavior.

## 2026-09-18

- Replaced the previous gifting integration with Tremendous sandbox order issuance, signed webhook intake, D1 provider migration, and Cloudflare Worker secret configuration.

## 2026-09-17

- Added the repository-grounded platform execution blueprint covering the admin, régie, and customer portals; durable CRM; proposal/PDF delivery; configuration; commissions; and production acceptance gates.

## 2026-09-16

- Rebuilt authentication as a dedicated branded route group with Clerk.
- Added role-scoped shells and screens for operator, finance, régie, back-office, team, apporteur, and customer users.
- Added organization, workflow, margin, commission, document, branding, and session settings surfaces.
- Added bill extraction validation and manual supplier-offer intake screens.
- Added authenticated DocuSeal submission creation, dossier binding, email 2FA, and a fail-safe webhook relay seam.
- Added the locked 66% network commission calculation and automated tests.
- Aligned platform tokens, typography, logo, and legal document footer with SaveWatt / AX TECH.
- Created the production Cloudflare D1 database in Western Europe and applied the initial multi-tenant, dossier, signature, commission, wallet, gifting, webhook, and audit schema.
- Added OpenNext/Workers configuration and generated a typed `DB` binding.
- Added provider-backed reward issuance with Clerk-derived recipients, D1 credit reservations, idempotent provider orders, failure rollbacks, and signed webhook intake.
- Hardened DocuSeal webhooks with timestamped HMAC verification and authoritative D1 signature updates.
- Added a guarded DocuSeal PDF-template uploader that refuses to run until the source is explicitly confirmed sanitized.
- Added segmented customer and partner self-registration with a D1-backed pending-access queue.
- Removed the unsafe default apporteur role: dashboard access now requires an active D1 membership.
- Added a mandatory D1 email whitelist for internal SaveWatt operator and finance accounts.
- Configured the Cloudflare Worker custom domain at `app.savewatt.fr`.
