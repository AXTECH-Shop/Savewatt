# Savewatt — AI Services

> In scope for v1: **structured bill extraction** with operator validation. Provider: Google Gemini Developer API using a restricted `GOOGLE_API_KEY` stored as a Cloudflare Worker secret. Standard Vertex AI Model Garden requests require OAuth/ADC and are not used by this Worker.

## 1. Feature inventory (v1)

| Feature | Status | Model | Human gate |
|---|---|---|---|
| Bill field extraction (PDF/photo → strict JSON) | v1 | `GEMINI_MODEL=gemini-3.6-flash` | **Required** — validation screen B6 |
| Extraction confidence scoring | v1 | derived from model + rule checks | surfaced as chips |
| (Later) offer summary / anomaly narrative | backlog | — | — |

## 2. Pipeline

```
upload → ClamAV → pdf text extract (native) → OCR fallback if scan
       → Gemini extraction (strict JSON schema)
       → per-field confidence (model signal × deterministic checks)
       → validation UI (PDF ↔ fields, highlight-to-source)
       → human accept → structured current_contract
```

The current Next.js route runs synchronously on the Node runtime for development. Production moves this work to a Cloudflare Worker/Queue and remains idempotent per bill upload.

## 3. Extraction schema (strict JSON)

Model must return **only** this shape (fields null if absent; never invent):

```json
{
  "supplier": {"name": null, "invoice_no": null, "invoice_date": null, "billing_account": null, "siren": null},
  "site": {"pdl_prm": null, "address": null, "segment": null, "acheminement_tariff": null,
           "subscribed_power_by_cadran": {}, "reached_power_by_cadran": {}},
  "offer": {"name": null, "contract_ref": null, "subscribed_at": null, "expires_at": null, "tacit_renewal": null},
  "consumption_by_cadran": [{"cadran": "HPE", "index_start": null, "index_end": null, "kwh": null, "unit_price_ht": null}],
  "subscription": null,
  "annex_services": [{"label": null, "amount": null}],
  "routing": {"components": [], "accise": null, "cta": null, "tva": null, "total_ht": null, "total_ttc": null},
  "history_monthly": []
}
```

Cadran vocabulary: HPH/HCH/HPE/HCE, or HP/HC, or base; pointe if C2/C3.

## 4. Confidence & deterministic checks

Per-field confidence = min(model self-report, rule score). Rule checks (also raise **flags**):
- `index_end − index_start × unit_price ≈ line amount`
- `Σ lines ≈ total_ht`; `total_ht × (1+tva) ≈ total_ttc`
- accise/TVA rate matches `regulatory_params` for the bill date
- `reached_power ≤ subscribed_power` (else flag "dépassement")
- `expires_at < bill_period` while billing continues → flag "reconduction tacite probable, vérifier date réelle"

Low-confidence (< threshold) fields render amber and focus-first in B6.

## 5. Supplier templates

Per-supplier recognition hints (EDF, Engie, TotalEnergies, Alpiq, Ekwateur, Vattenfall, Octopus…), extensible. Template selects few-shot hints + field-position priors; the JSON schema is invariant across suppliers.

## 6. Guardrails, privacy, cost

- **Strict JSON schema**, temperature 0, no free-text side-channel; reject/repair non-conforming output.
- **No PII in logs**: prompts/outputs with client data are not written to app logs in clear; stored under KMS-enc where retained.
- **Human validation is mandatory** before data is trusted downstream (comparator/offer).
- Confirm Gemini API data-handling terms before processing live customer bills; Gemini Developer API does not provide the Vertex regional endpoint control previously planned.
- **Authentication:** a `GOOGLE_API_KEY` restricted to `generativelanguage.googleapis.com` is held in `.env.local` for local development and as a Cloudflare Worker secret in production. It must never be exposed through a `NEXT_PUBLIC_` variable.
- **Billing:** the project must have active Gemini API prepayment credits before live extraction can succeed.
- **Cost controls:** cap pages per bill, reject oversized files, cache supplier context, and batch only inside a scoped queue job.
- **Eval fixture:** the JOSH §7.4 bill is a golden extraction test (expected fields + expected flags) — part of the Lot 2 blocking tests.
