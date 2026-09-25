# Symphonics Pricing Model — Mechanism Spec

Status: validated against real documents (exact reconciliation to the euro).
Audience: platform engineers implementing the configurable estimate engine
(`savewatt-platform/src/lib/offers/estimate.ts`, migration `0014`).

SaveWatt distributes Symphonics offers: Symphonics is the final seller,
SaveWatt adds a commercial margin and presents the offer. The platform must
reproduce the Symphonics "budget prévisionnel" exactly, keep every driver of
that budget admin-configurable, and show the régie network **final prices
only** (never buy price, CEE/capacity components, or margin).

## 1. Validated formula (budget prévisionnel, annual)

| Budget line | Formula | Unit of rate |
|---|---|---|
| Énergie | Σ_cadran V_c × prix_final_c | prix_final = électron + marge, €/MWh |
| Abonnement | 12 × abo | €/month |
| CEE | V_total × cee | €/MWh |
| Capacité (GC) | V_total × capa | €/MWh |
| Acheminement fixe | gestion × 365 + comptage × 365 + soutirage_fixe × PS × 365 | c€/day, c€/day, c€/kW/day |
| Acheminement variable | Σ_cadran V_c(kWh) × turpe_c | c€/kWh, per cadran |
| Accise | V_total × accise | €/MWh |
| CTA | cta_rate × acheminement_fixe | ratio on TURPE fixed only |
| TVA | tva_rate × HT | ratio |

Rounding convention (validated): each **component total** is rounded to the
nearest euro (`Math.round`, half-up on positive values); per-cadran amounts are
kept at cent precision for display only and are **not** rounded before
summing. `HT = Σ rounded components`, `TVA = round(tva_rate × HT)`,
`TTC = HT + TVA`.

## 2. Worked reconciliation — Josh / AX TECH proposal (reference fixture)

Inputs from the Symphonics proposal (pdf2) and the EDF bill (pdf5):

- Forecast volumes (MWh): HPH 29.00, HCH 6.01, HPE 23.98, HCE 3.39 → total 62.38
- Prix électron (€/MWh): HPH 140.48, HCH 107.12, HPE 77.40, HCE 96.08
- Abonnement 20.00 €/mois, CEE 9.66 €/MWh, capa 5.71 €/MWh (puissance CAPA 19 kW)
- Puissance souscrite 37 kW × 4 cadrans
- TURPE (from EDF bill, TURPE 6): gestion 60.97 c€/c.j, comptage 79.97 c€/p.j,
  soutirage fixe 4.97 c€/kW/j; variable HPH 7.12, HCH 4.34, HPE 2.19, HCE 1.57 c€/kWh
- Accise 26.35 €/MWh (2.635 c€/kWh on the bill), CTA 15 %, TVA 20 %

| Line | Computation | Symphonics states | Engine | Δ |
|---|---|---|---|---|
| Énergie | 29.00×140.48 + 6.01×107.12 + 23.98×77.40 + 3.39×96.08 = 6 899.47 | 6 899 € | 6 899 € | 0 |
| Abonnement | 12 × 20 | 240 € | 240 € | 0 |
| CEE | 62.38 × 9.66 = 602.59 | 603 € | 603 € | 0 |
| Capacité | 62.38 × 5.71 = 356.19 | 356 € | 356 € | 0 |
| Acheminement fixe | (60.97 + 79.97)×365/100 + 4.97×37×365/100 = 514.43 + 671.20 = 1 185.63 → 1 186 | — | 1 186 € | — |
| Acheminement variable | 2 064.80 + 260.83 + 525.16 + 53.22 = 2 904.02 → 2 904 | — | 2 904 € | — |
| Acheminement | 1 186 + 2 904 | 4 090 € | 4 090 € | 0 |
| Accise | 62.38 × 26.35 = 1 643.71 | 1 644 € | 1 644 € | 0 |
| CTA | 0.15 × 1 186 = 177.90 | 178 € | 178 € | 0 |
| HT | 6 899+240+603+356+4 090+1 644+178 | — | 14 010 € | 0 |
| TVA | 0.20 × 14 010 | 2 802 € | 2 802 € | 0 |
| **Total TTC** | | **16 812 €** | **16 812 €** | **0** |

This fixture is replayed as a unit test (`offer-engine.test.ts`).

## 3. Known data caveat

The proposal's électron prices (140.48 / 107.12 / 77.40 / 96.08 €/MWh,
delivery 07/03/2027 → 06/03/2029) differ from the signed CPV prices
(203 / 163 / 121 / 137 €/MWh) because they price **different delivery
periods** — électron is forward-curve dependent. The engine therefore treats
the per-cadran électron price as an **input** (supplier price sheet, per
delivery period); it never derives it.

## 4. Variable inventory

Visibility column: **admin** = SaveWatt operator roles (SUPER_ADMIN /
OPERATOR_FINANCE); **régie** = network roles (MASTER_ADMIN, MASTER_BACKOFFICE,
SUB_REGIE_ADMIN, TEAM_MANAGER, APPORTEUR, READ_ONLY); **customer** = what may
appear on the customer-facing offer PDF / `budget_json`.

| Variable | Unit | Source | Configured by | Admin | Régie | Customer |
|---|---|---|---|---|---|---|
| électron price per cadran (per delivery period) | €/MWh | Supplier price sheet (pdf2 p.1) | admin (supplier offer entry) | full | hidden | hidden |
| margin €/MWh (per grid, min/default/max) | €/MWh | SaveWatt commercial policy | admin (grid), régie grid capped by admin grid | full | hidden (bounds stripped) | hidden |
| final client price per cadran | €/MWh | électron + margin | derived | full | full | full |
| consumption forecast per cadran | MWh/an | Supplier forecast (pdf2 p.1) / extraction annualization | admin (supplier offer entry) | full | full | full |
| puissance souscrite (per cadran) | kW | EDF bill (pdf5 p.4) | extraction | full | full | full |
| abonnement | €/mois | Supplier proposal (pdf2 p.1) | admin (supplier offer entry) | full | full | full |
| CEE | €/MWh | Supplier proposal (pdf2 p.1) | admin (pricing parameters) | full | hidden (folded into totals) | total only |
| capa (GC) | €/MWh | Supplier proposal (pdf2 p.1) | admin (pricing parameters) | full | hidden | total only |
| accise | €/MWh | Regulation, verified on EDF bill (pdf5 p.4: 2.635 c€/kWh) | admin (pricing parameters) | full | full | full |
| CTA rate | ratio | EDF bill (pdf5 p.4: 15.00 %) | admin (pricing parameters) | full | full | full |
| TVA rate | ratio | EDF bill (pdf5 p.2: 20.00 %) | admin (pricing parameters) | full | full | full |
| TURPE fixed (gestion, comptage, soutirage fixe) | c€/j, c€/j, c€/kW/j | EDF bill (pdf5 p.4), TURPE 6 | admin (pricing parameters, versioned per TURPE edition) | full | full | full |
| TURPE variable per cadran | c€/kWh | EDF bill (pdf5 p.4), TURPE 6 | admin (pricing parameters) | full | full | full |
| term years | years | Supplier proposal (pdf2 p.1: 24-month period 2027→2029) | admin (supplier offer entry) | full | full | full |
| validity date | date | Supplier proposal (pdf2 p.1: 16/09/2026) | admin (supplier offer entry) | full | full | full |

Storage mapping: pass-through rates (CEE, capa, accise, CTA, TVA, TURPE) live
in the versioned, org-scoped `pricing_parameters` table (migration 0014).
Margin bounds live in `margin_grids` with `role_scope` ADMIN/REGIE; the régie
grid's max may not exceed the admin grid's max (repository-enforced). Per-offer
inputs (électron, volumes, abonnement, term, validity) stay on
`supplier_offers` / `supplier_offer_lines`. The computed customer-safe budget
snapshot is stored on `offer_versions.budget_json` at version creation.

## 5. Contract mechanics (reference for `legal_copy_json`)

From the Symphonics contract (pdf1), worth encoding as structured legal copy
on offers — not priced by the engine:

- **Art. 5.5 — consumption tolerance band**: ±20 % around the forecast load
  curve. Above 120 %, energy beyond the band is repriced on EEX hourly spot;
  below 80 %, a compensating term applies (France Baseload signature price
  minus average spot, × unconsumed volume beyond the 80 % tolerance).
  Significant durable profile changes trigger a 30-day good-faith
  renegotiation, failing which Symphonics may terminate the affected sites.
- **Art. 5.4 / TURPE pass-through**: acheminement is rebilled "à l'euro
  l'euro"; any new TURPE edition is fully passed through from its effective
  date — hence the versioned TURPE grid in `pricing_parameters`.
- **Art. 3.4 — 100 % renewable**: GO-certified (European Guarantees of Origin).
- **Art. 8 — deposit**: Symphonics may require a 5 000 € guarantee deposit at
  subscription or mid-contract (10-day constitution deadline mid-contract;
  refunded within 3 months of termination).
- **Art. 9.3.1.3 — early termination**: 500 € HT / site / month remaining until
  term (waived for relocation without supplier change or judicial cessation,
  45-day notice with proof).
- **Tacit renewal**: contract renews by tacit agreement absent timely notice
  (see Art. 9 duration clause in pdf1).

## 6. Source map

| Constant / fact | Value | Document | Location |
|---|---|---|---|
| Forecast volumes 29.00 / 6.01 / 23.98 / 3.39 MWh | pdf2 `tmp/pdf-analysis/pdf2-josh-bill.txt` | Page 1, "Consommation annuelle prévisionnelle" |
| Électron prices 140.48 / 107.12 / 77.40 / 96.08 €/MWh | pdf2 | Page 1, "Prix électron" |
| Abonnement 20 €/mois, CEE 9.66 €/MWh, capa 5.71 €/MWh, puissance CAPA 19 kW | pdf2 | Page 1, "Obligations et compléments" |
| Budget lines 6 899 / 240 / 603 / 356 / 4 090 / 1 644 / 178 / 2 802 / 16 812 € | pdf2 | Page 2, "Budgets prévisionnels" |
| Validity 16/09/2026, period 07/03/2027→06/03/2029, PDL 50066947359734, segment C4 | pdf2 | Page 1 header |
| TURPE gestion 60.97 c€/c.j, comptage 79.97 c€/p.j, soutirage fixe 4.97 c€/kW | pdf5 `tmp/pdf-analysis/pdf5-edf-facture.txt` | Page 4, "Utilisation du réseau" |
| TURPE variable 7.12 / 4.34 / 2.19 / 1.57 c€/kWh (HPH/HCH/HPE/HCE) | pdf5 | Page 4, composantes de soutirage |
| Accise 2.635 c€/kWh = 26.35 €/MWh | pdf5 | Page 4, "Taxes et contributions" |
| CTA 15.00 % (base = acheminement fixe, 100.73 → 15.11 €) | pdf5 | Page 4 |
| TVA 20.00 % | pdf5 | Page 2 |
| Current contract: abo 32.50 €/mois, HPE 19.095 c€/kWh, HCE 11.354 c€/kWh, PS 37 kW × 4 | pdf5 | Page 4 |
| Tolerance band ±20 % (Art. 5.5), GC pricing (Art. 5.3), TURPE pass-through | pdf1 `tmp/pdf-analysis/pdf1-symphonics-contract.txt` | Articles 5.3–5.5 |
| Deposit 5 000 € (Art. 8.2), termination 500 € HT/site/month (Art. 9.3.1.3), 100 % renewable GO (Art. 3.4) | pdf1 | Articles 8, 9.3.1.3, 3.4 |
