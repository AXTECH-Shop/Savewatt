# SaveWatt commercial platform

Role-scoped commercial workspace for AX TECH's SaveWatt activity:

**Upload current contract + bill → build a proposal → client signs via DocuSeal.**

The interface covers operator, finance, master régie, back-office, team, apporteur and customer views. Cloudflare D1 is the durable transactional store; the current demo workspace still uses its browser adapter until each screen is moved to the D1 repositories.

## Run

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run dev
```

Open http://localhost:3000 → redirects to `/fr`. Switch FR/EN from the sidebar (top-right on mobile).

Walkthrough:
1. Dashboard → **Load the sample file** (the "JOSH" acceptance case from the brief §7.4), or **New proposal** to create one and upload PDFs.
2. Open the file → review the **current contract** and the **before/after comparator**; drag the **margin** (hidden from the client) and watch savings update.
3. **Generate proposal** → client-facing document (final prices only, no buy price/margin).
4. **Send for signature** → creates a DocuSeal submission → signature status page.

Demo dossier data is still stored in the browser (`localStorage`). D1 already persists integration events, signature state, organizations, dossiers, commissions, wallets, and Giftogram redemption records; UI repository migration remains incremental.

Set `NEXT_PUBLIC_SAVEWATT_DEMO_MODE=true` only for local role walkthroughs. It disables route protection and must never be enabled in production.

## DocuSeal

Signing runs in **mock mode** unless DocuSeal is configured. To connect a real DocuSeal
account, add a `.env.local` with:

```
DOCUSEAL_BASE_URL=https://api.docuseal.com
DOCUSEAL_API_TOKEN=your_x_auth_token
DOCUSEAL_TEMPLATE_ID=123456
DOCUSEAL_SIGN_URL=https://docuseal.com
NEXT_PUBLIC_DOCUSEAL_EMBED_HOST=cdn.docuseal.com
DOCUSEAL_WEBHOOK_SECRET=whsec_from_docuseal_console
```

Configure the DocuSeal webhook as `/api/docuseal/webhook`. The handler verifies the `X-Docuseal-Signature` HMAC over the untouched request body, deduplicates deliveries in D1, and only then marks the stored dossier signed. For EU Cloud use `api.docuseal.eu` / `docuseal.eu`; self-hosted deployments use their own `/api` base.

To upload a clean contract master, put the token only in the ignored `.env.local`, set `DOCUSEAL_SOURCE_CONFIRMED_SANITIZED=true`, then run:

```bash
npm run docuseal:upload-template -- /absolute/path/to/clean-contract.pdf
```

The upload creates a private template (`shared_link: false`) with client date and signature fields. Never use an already signed customer contract as a reusable template.

## Giftogram

Gift issuance stays disabled until the sandbox campaign and secrets are configured:

```text
GIFTOGRAM_BASE_URL=https://api.giftogram.com/api/v1
GIFTOGRAM_CAMPAIGN_ID=campaign-uuid
GIFTOGRAM_API_KEY=server-side-api-key
GIFTOGRAM_WEBHOOK_SECRET=webhook-client-secret
```

`POST /api/gifting/redemptions` requires authentication and an `Idempotency-Key`. It derives the recipient from Clerk, reserves the D1 wallet balance, calls Giftogram, and releases the reservation if the provider fails. The webhook endpoint verifies `x-giftogram-signature` before storing the event.

## Cloudflare D1

The `savewatt` database and its `DB` binding are declared in `wrangler.jsonc`. Apply migrations with Node 22:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Clerk · next-intl · Gemini via ADC · Phosphor icons.
Deploy target: **Cloudflare Workers** through OpenNext, with D1 for transactional data and R2 planned for documents.
