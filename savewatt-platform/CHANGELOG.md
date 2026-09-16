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
- Added segmented customer and partner self-registration with a D1-backed pending-access queue.
- Removed the unsafe default apporteur role: dashboard access now requires an active D1 membership.
- Added a mandatory D1 email whitelist for internal SaveWatt operator and finance accounts.
- Configured the Cloudflare Worker custom domain at `app.savewatt.fr`.
- Removed the landing-page theme switcher and connected every `Connexion` link to the hosted application.
- Split customer and partner login selection onto `app.savewatt.fr` and internal access onto `admin.savewatt.fr`.
- Enforced hostname-level role separation so internal accounts cannot enter the customer app and external accounts cannot enter administration.
