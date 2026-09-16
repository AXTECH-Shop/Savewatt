# Changelog

## 2026-09-16

- Rebuilt authentication as a dedicated branded route group with Clerk.
- Added role-scoped shells and screens for operator, finance, régie, back-office, team, apporteur, and customer users.
- Added organization, workflow, margin, commission, document, branding, and session settings surfaces.
- Added bill extraction validation and manual supplier-offer intake screens.
- Added authenticated DocuSeal submission creation, dossier binding, email 2FA, and a fail-safe webhook relay seam.
- Added the locked 66% network commission calculation and automated tests.
- Aligned platform tokens, typography, logo, and legal document footer with SaveWatt / AX TECH.
- Created the production Cloudflare D1 database in Western Europe and applied the initial multi-tenant, dossier, signature, commission, wallet, Giftogram, webhook, and audit schema.
- Added OpenNext/Workers configuration and generated a typed `DB` binding.
- Added Giftogram order issuance with Clerk-derived recipients, D1 credit reservations, idempotent provider orders, failure rollbacks, and signed webhook intake.
- Hardened DocuSeal webhooks with timestamped HMAC verification and authoritative D1 signature updates.
- Added a guarded DocuSeal PDF-template uploader that refuses to run until the source is explicitly confirmed sanitized.
