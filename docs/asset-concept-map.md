# SaveWatt Asset Concept Map

## Purpose

This document defines what each website image must communicate before visual
styling is applied. It prevents attractive but meaningless diagrams.

Every asset must pass this test:

> Can a French business decision-maker understand the image's message in three
> seconds without reading a paragraph?

## Universal Story

```text
FACTURE REÇUE
      ↓
ERREUR PRÉCISE IDENTIFIÉE
      ↓
RÉCLAMATION TRAITÉE
      ↓
ARGENT RÉCUPÉRÉ
      ↓
CONTRAT CORRIGÉ ET SUIVI
```

The current-green line always means active SaveWatt intervention. Navy and grey
show the original state. Amber/coral marks the exact error. A green check means
a verified outcome. All large scenes use the approved colored isometric
white-canvas style with French callout cards.

## Asset Stories

| Asset | Visual sentence | Familiar objects | Visible outcome |
|---|---|---|---|
| A05 OG | SaveWatt finds invoice errors and recovers money | Invoice, highlighted row, euro return arrow, client building | Euro arrow reaches client |
| A06 Hero | An incorrect invoice charge is found and returned | Invoice, scan frame, supplier building, client building | Returned euro plus check |
| A07 Anomalies | Four common billing problems have specific corrections | Duplicate rows, capacity bars, tax sum, price comparison | Error marked and correction selected |
| A08a Audit | One incorrect invoice row is identified | Invoice and scan frame | Row highlighted |
| A08b Recovery | Money comes back from supplier to client | Two buildings and euro arrow | Arrow ends at client |
| A08c Power | Contracted power is higher than real use | Two comparison bars | Correct lower level selected |
| A08d Contracts | The more suitable contract costs less | Two contract sheets and price bars | Lower valid bar checked |
| A08e CEE | A qualifying improvement becomes a validated certificate | Building, improvement arrow, certificate | Certificate checked |
| A08f Monitoring | The same invoice checks continue every month | Three monthly invoices | Repeated verified row |
| A09 Process | Send, detect, recover, optimize | Invoice, scan, euro return, lower price | Four-step progression |
| A10a Collectivités | Several public buildings are analyzed together | Mairie, school, street light | One consolidated invoice path |
| A10b Multi-sites | Multiple sites are consolidated into one analysis | Three office/store buildings | Lines converge into checked report |
| A10c Industry | Site usage and contract values are compared | Factory, warehouse, meter data | Corrected contract path |
| A11 Independence | SaveWatt traces a charge and returns it to the client | Invoice row, supplier, client | Full trace remains visible |
| A12 Results | A claimed result is checked against source rows | Small table and source invoice | Final row verified |
| A14 Final CTA | One invoice is enough to discover a recoverable error | Invoice, scan, euro arrow | Positive check at end |
| A15 Upload | A recent invoice is securely received for analysis | Invoice, transfer boundary, confirmation panel | Receipt confirmed |

## Required HTML Labels

Generated explainers include short French labels and values. Important copy is
also represented in accessible HTML or alt text so the raster is never the only
source of meaning.

### Hero

```text
Votre facture
Anomalie détectée
Réclamation au fournisseur
Montant récupéré
```

### Process

```text
1 · Transmission
2 · Audit
3 · Récupération
4 · Optimisation
```

### Anomaly Atlas

```text
Erreur de facturation
Puissance inadaptée
Taxes & TURPE
Contrat obsolète
```

## Rejection Rules

Reject an asset if any answer is yes:

- Does it resemble an antique device, gauge, military object or retro machine?
- Does it contain an object that cannot be named immediately?
- Are there more than four primary objects in one scene?
- Is the direction of the process unclear?
- Does the green line decorate rather than explain?
- Is the beneficial outcome absent?
- Would removing the surrounding paragraph make the image meaningless?
- Does it need animation to become understandable?

## Production Sequence

1. Approve A06 hero concept.
2. Approve A09 process using the same visual grammar.
3. Generate A08 service glyph family.
4. Generate A07 anomaly atlas and A10 sector glyphs.
5. Generate supporting A11, A12, A14 and A15 assets.
6. Generate the Open Graph composition last.

The approved A06 white-canvas sample is the visual reference for all production
assets. Dark mode uses the same asset on a warm-white technical plate.
