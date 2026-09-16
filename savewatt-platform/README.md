# SaveWatt commercial platform

Role-scoped commercial workspace for AX TECH's SaveWatt activity:

**Upload current contract + bill → build a proposal → client signs via DocuSeal.**

The interface covers operator, finance, master régie, back-office, team, apporteur and customer views. Durable multi-tenant persistence remains gated on the D1 vs Postgres/Hyperdrive decision in `STATUS.md`.

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

Demo dossier data is stored in the browser (`localStorage`) until the database decision is made. Screens that need durable infrastructure say so and do not show false success states.

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
DOCUSEAL_WEBHOOK_TOKEN=a-long-random-token
DOCUSEAL_COMPLETION_URL=https://your-durable-worker.example/docuseal
DOCUSEAL_COMPLETION_TOKEN=worker-bearer-secret
```

Configure the DocuSeal webhook as `/api/docuseal/webhook?token=...`. Completed events return a retryable error until a durable completion worker is configured, avoiding a false signed/archive state. For EU Cloud use `api.docuseal.eu` / `docuseal.eu`; self-hosted deployments use their own `/api` base.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Clerk · next-intl · Gemini via ADC · Phosphor icons.
Deploy target: **Cloudflare** (OpenNext/Workers, R2, and D1 or Postgres via Hyperdrive).
