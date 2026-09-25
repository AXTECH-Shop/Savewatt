# Savewatt — Open Questions

> Unresolved items needing stakeholder / legal / partner input before or during build. Grouped by urgency.

## Blocking a lot (resolve before that lot)

| # | Question | Blocks | Owner |
|---|---|---|---|
| OQ1 | **Symphonics CSV/Excel format** for (a) price proposals and (b) monthly consumption — exact columns, units, encoding. | Lot 3 / Lot 6 | Symphonics + AX TECH |
| OQ2 | **Commission margin base** default confirmation (electron only vs electron+CEE+capacity vs all-in) before billing goes live. | Lot 6 | AX TECH finance |
| OQ3 | **Downstream commission grid** shape per level (master→sub-régie→team→apporteur): €/MWh, %, prime, caps, clawback windows — concrete defaults. | Lot 6 | AX TECH / masters |
| OQ4 | **Factur-X issuing entity details** + agreed **PA (plateforme agréée)** for e-invoicing transmission; SIREN. | Lot 6 | AX TECH finance |
| OQ5 | **Yousign account/plan**, signer authentication (SMS vs email OTP), and which documents (contract, conditions, SEPA mandate) per default workflow. | Lot 4 | AX TECH |

## Regulatory / legal (need a specialist)

| # | Question |
|---|---|
| OQ6 | Exact **micro-entreprise energy-supply rules** (Code conso / Code énergie) — mentions, délais, "effectif/CA" thresholds. Brief says "règles exactes à faire valider par un juriste"; build a parameterable rules engine meanwhile. |
| OQ7 | **DPAs** with Symphonics, Yousign, the hosting provider, and Anthropic (LLM processing of bill PII) — confirm EU data terms. |
| OQ8 | **Retention specifics**: how many days after supplier validation to purge ID/RIB; confirm 10y for contracts/invoices. |

## Product / commercial

| # | Question |
|---|---|
| OQ9 | Does Symphonics require **ID/RIB** to accept a contract? (Determines default workflow doc steps even though collection is optional per D5.) |
| OQ10 | Clawback policy: window + whether it nets against future commissions or is invoiced back. |
| OQ11 | White-label: will any master need a **dedicated instance** (vs configuration-only) in the near term? Affects infra planning. |
| OQ12 | Target **EU cloud provider** (Scaleway / OVHcloud / AWS Paris) and IaC tool (Terraform vs Pulumi). |
| OQ13 | Binding **SLA / RTO / RPO** commitments beyond the design targets (99.9%, 4h/24h)? |

## Technical (decide during build)

| # | Question |
|---|---|
| OQ14 | Open a **partner API** (NestJS standalone) before app maturity? If yes, revisit T2. |
| OQ15 | SMS provider choice (OTP + notifications), EU-based. |
| OQ16 | Multi-region DB posture — single-region + backups (current plan) vs active multi-region (cost/complexity). |
