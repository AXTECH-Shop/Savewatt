# SaveWatt Documentation Index

SaveWatt is a commercial brand operated by **AX TECH — ECOLED WAVE CONCEPT**, with
**Symphonics** as the approved supplier partner. The business has two sides:

1. A public marketing site (already shipped) that lets enterprises request a free
   comparison against a Symphonics proposal, and lets régies / business introducers
   request a demo of the sales, hierarchy, document, contract and commission workflow.
2. A multi-tenant B2B platform for managing commercial régies (sales hierarchy,
   invoice analysis, offer building, e-signature, supplier API, commissions).

Older June 2026 documents describing SaveWatt as an *independent bureau d'études*
doing invoice-error recovery have been removed — that positioning is superseded.

## Source of Truth

| Document | Purpose |
|---|---|
| `LANDING-PIVOT-2026-09.md` | Pivot decision record — identity, audiences, claims and commercial disclosure. Supersedes all prior positioning. |
| `prompt_plateforme_regies_symphonics.md` | Full specification for the régies commercial-management platform (the current build focus). |
| `offer-workflow.md` | How a SaveWatt offer is built from a Symphonics proposal (manual, first ~100 deals). |
| `visual-dna.md` | Visual language / design system retained for the live landing page. |

## Platform Specifications

The engineering specs for the platform live outside this folder in `specs/`
(`backend-specs.md`, `frontend-specs.md`, `api-docs.md`, `ai-services.md`,
`cloud-architecture.md`, `design-system.md`, `decisions.md`, `delivery-lots.md`,
`rights-matrix.md`, `brief-normalized.md`, `open-questions.md`, `preferences.yaml`).
The platform application itself is in `savewatt-platform/`.

## Test Data

Real anonymized invoices used for the platform's invoice-analysis test case (see
§7.4 of `prompt_plateforme_regies_symphonics.md`):

- `eDF_Facture_20260914_134622.pdf`
- `Josh_Rue_du_Poteau_50066947359734 (1).pdf`
