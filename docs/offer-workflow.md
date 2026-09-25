# How a SaveWatt Offer Is Made (Symphonics)

_Last updated: 2026-09-16 · Applies to the first ~100 deals (manual, no Symphonics API)_

This document explains the **real workflow** for turning a client's current
electricity bill into a signed SaveWatt offer built on a **Symphonics** price
proposal. Today Symphonics gives us prices **manually** (a price sheet / PDF per
site), so the platform's role is to make that manual process fast, consistent,
branded, and auditable. The math and screens already exist in the demo with mock
data — this describes what they represent and what a rep actually does.

---

## 1. The players and what each provides

| Who | Provides | Sensitive? |
|---|---|---|
| **Client** (business) | A recent bill (ideally one **winter** + one **summer** to cover all price bands), the site's **PDL** (14 digits), segment (C2–C5), and — if known — contract end date & renewal terms. | The client never sees our buy price or margin. |
| **Symphonics** (supplier) | A **price proposal** for that specific PDL: per-cadran **electron** price (€/MWh), **abonnement** (€/month), **CEE** (€/MWh), **capacity** (€/MWh), forecast **volumes** per cadran, and a **validity date**. Delivered manually today (PDF/sheet). | This is our cost basis — internal only. |
| **Régie / apporteur** (SaveWatt network) | The **margin** to add (per-cadran or global), within the bounds AX TECH allows. | Internal only. |
| **SaveWatt / AX TECH** | The comparator, the branded offer, the contract, and the commission cascade. | — |

---

## 2. What "à périmètre identique" means (the core rule)

We only compare the parts of the price that actually change when the client
switches supplier:

- **Compared:** the energy price per cadran. Our **all-in comparable price** =
  `electron + CEE + capacity + margin`. This is what goes head-to-head against the
  client's current per-cadran price.
- **Neutralised (shown but not counted):** **acheminement (TURPE)**, **accise**,
  **CTA**, **TVA** — these are the same whichever supplier the client picks (unless
  subscribed power changes). So they don't affect the savings number.
- **Also compared:** the **abonnement** (standing charge), €/month → ×12.

> Assumption to confirm before real billing (OQ2): the client's current price is
> treated as "all-in energy" (already including its own CEE + capacity). If a
> client's current offer excludes CEE/capacity, the rep must flag it so we compare
> like-for-like.

Savings:
```
annual energy saving = Σ over cadrans ( currentPrice − proposedAllIn ) × annualVolume
subscription saving  = ( currentAbonnement − proposedAbonnement ) × 12
annual saving        = annual energy saving + subscription saving
term saving          = annual saving × contract term (years)
```
The margin is **inside** the proposed price, so it silently reduces the displayed
saving — the client sees only final prices and the resulting saving, never the
margin or Symphonics' raw price.

---

## 3. The step-by-step workflow

```
Client bill ──▶ 1. Capture current contract
                     │
Symphonics sheet ──▶ 2. Enter Symphonics proposal
                     │
Régie margin ──────▶ 3. Apply margin (within grid)
                     │
                4. Comparator computes savings + alerts
                     │
                5. Generate branded offer PDF (final prices only)
                     │
                6. Send for e-signature (DocuSeal)
                     │
                7. Signed → archive + back-office check
                     │
                8. (Later) transmit to Symphonics + track consumption → commissions
```

**1. Capture the current contract.**
Upload the client's bill. Today this is entered/validated by hand (or via the
sample loader). Soon **OCR extraction** (see `STATUS.md` §C) reads: supplier, offer
name, PDL, segment, **contract dates** (and a **tacit-renewal** flag when the
printed end date has passed but billing continues), per-cadran **index + unit
price**, abonnement, taxes. A rep validates the extracted fields against the PDF.

**2. Enter the Symphonics proposal.**
The rep types (or CSV-imports) the Symphonics price sheet for that PDL: per-cadran
electron €/MWh, abonnement, CEE €/MWh, capacity €/MWh, forecast volumes, and the
**validity date**. (When Symphonics ships an API, this step becomes automatic —
the platform already isolates it behind a connector seam.)

**3. Apply margin.**
The rep sets the margin (per-cadran or global, €/MWh), bounded by the régie's
margin grid. Over the bound → needs a supervisor's approval.

**4. Comparator + alerts.**
The platform shows current vs proposed per cadran, the €/MWh delta, gain/year, the
abonnement saving, and the annual + term totals. It raises alerts:
- **Winter band missing** — the bill provided only covers summer, so winter (HPH/HCH)
  can't be compared → ask for a winter bill.
- **HC > HP** — proposed off-peak priced above peak (sanity flag).
- **Offer expiring < 48 h** — Symphonics validity almost gone.

**5. Generate the branded offer PDF.**
Client-facing document at the SaveWatt/AX TECH charte (logo, colors, legal
identifiers). Shows **final prices and the saving only** — never the buy price or
margin. Offer validity is **≤ Symphonics validity** and auto-expires.

**6. E-signature (DocuSeal).**
The offer/contract goes to DocuSeal for signing; on `submission.completed` the
dossier flips to **Signed** and the signed PDF + proof is archived (R2, 10-year
retention).

**7. Back-office check.** Verify pieces (signer = legal rep, documents legible),
then mark ready.

**8. Later (post-first-100 / with API).** Transmit the signed contract to
Symphonics, ingest monthly consumption, and settle the **commission cascade**
(66% of margin to the network → 50/50 AX TECH/master → configurable cascade to
sub-régies/teams/apporteurs), redeemable via GoGift.

---

## 4. Worked example — the JOSH case (§7.4)

**Current (EDF bill, PDL 50066947359734, C4, 37 kW):**
HPE 190.95 €/MWh, HCE 113.54 €/MWh, abonnement 32.50 €/month; contract shows an
end date already passed while billing continues → **tacit-renewal flag**.

**Symphonics proposal (valid 16/09/2026, term 07/03/2027–06/03/2029):**
electron HPH 140.48 / HCH 107.12 / HPE 77.40 / HCE 96.08 €/MWh; abonnement 20 €/month;
CEE 9.66 €/MWh; capacity 5.71 €/MWh; volumes HPH 29.00 / HCH 6.01 / HPE 23.98 / HCE 3.39 MWh.

**Result (margin = 0), à périmètre identique:**
- HPE: proposed all-in = 77.40 + 9.66 + 5.71 = **92.77 €/MWh** → saving ≈ **€2,354/yr**
- HCE: proposed all-in = 96.08 + 9.66 + 5.71 = **111.45 €/MWh** → saving ≈ **€7/yr**
- Abonnement: (32.50 − 20) × 12 = **€150/yr**
- **Total ≈ €2,511/yr**
- Alerts fired: **winter band missing** (bill was summer-only), **HC > HP**,
  **offer expiring < 48 h**.

This is the platform's golden fixture — the comparator, extraction, and (later)
commission unit tests must all reproduce it.

---

## 5. Data the platform must capture to make an offer

Checklist (drives the forms and the OCR schema):

- **Client / site:** legal name, SIREN, contact, signer email, **PDL (14)**, segment.
- **Current contract:** supplier, offer name, **subscription date**, **end date +
  renewal terms**, per-cadran index + **unit price**, abonnement, listed services.
- **Symphonics proposal:** per-cadran electron, abonnement, **CEE**, **capacity**,
  forecast volumes, **validity date**.
- **Commercial:** margin (per-cadran/global) + the applicable grid bounds; term.
- **Files:** the bill PDF(s) and, later, the Symphonics sheet — stored in R2.

---

## 6. Mock vs real — status today

| Piece | Today | Becomes real via |
|---|---|---|
| Current-contract figures | Sample/manual (JOSH) | OCR extraction (STATUS §C) + editable builder (§D2) |
| Symphonics proposal | Mock in demo data | Manual entry / CSV (§D1) → API later (§Q4) |
| Comparator + alerts | **Real** (matches §7.3 math) | — |
| Offer PDF | Browser print | Server-side **branded** PDF (§A4, §D4) |
| Signature | Mock mode | **DocuSeal** (§B) |
| Files | Name/size only | **R2** bytes (§D3) |
| Commissions / GoGift | Not built | Commission engine (§E4) + GoGift (§E5) |
