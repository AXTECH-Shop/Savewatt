---
route: /
page_type: homepage_and_primary_conversion_page
language: fr-FR
review_language: en
primary_conversion: demande_audit_gratuit
last_updated: 2026-06-06
visual_source: docs/visual-dna.md
status: build_ready_plan
---

# SAVEWATT - HOMEPAGE & LANDING PAGE PRODUCTION PLAN

## French-first copy, layout, assets, responsive behavior, motion, SEO and trust requirements

---

> **LANGUAGE CONTRACT**
>
> The shipped website is French. The French copy in this document is the production source. English translations exist only so stakeholders can review tone and meaning. Do not render both languages on the public French page.

> **CLAIM CONTRACT**
>
> Savings figures and example recoveries from the brochure are illustrative until SaveWatt supplies approved evidence. Display the required qualification beside every illustrative result. Do not publish the claim `8 factures sur 10` without an approved source.

---

## 0. PAGE OBJECTIVE

### Primary action

`Demander un audit gratuit`

### Secondary action

`Envoyer une facture récente`

### Audience

- collectivités, communes and EPCI
- enterprises with significant energy spend
- multi-site tertiary organizations
- industrial and logistics sites
- hotels, residences, copropriétés and syndics

### Offer

SaveWatt reviews up to five years of electricity and gas invoices, identifies anomalies and overbilling, handles recovery claims, optimizes contracts and subscribed power, and provides ongoing monitoring.

### Risk reversal

- no upfront fee
- audit without commitment
- remuneration only on effective gains
- SaveWatt handles the process

### Landing-page model

Long-form conversion page:

```
ATTENTION  → Hero and direct promise
INTEREST   → Hidden leakage and anomaly types
DESIRE     → Complete service, process, sectors, differentiation and proof
ACTION     → FAQ, low-friction audit request, final CTA
```

---

## 1. PAGE LAYOUT MAP

```text
┌────────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER - floating/inset deep green navigation           │
├────────────────────────────────────────────────────────────────┤
│ S01 HERO                 760-900px desktop / auto mobile       │
│ 7/5 split: copy + CTA / A06 hero audit illustration            │
├────────────────────────────────────────────────────────────────┤
│ S02 REASSURANCE STRIP    160-220px                             │
│ 4 proof statements in live HTML                                │
├────────────────────────────────────────────────────────────────┤
│ S03 LE CONSTAT           760-900px                             │
│ 5/7 split: copy / A07 anomaly atlas                            │
├────────────────────────────────────────────────────────────────┤
│ S04 NOTRE SOLUTION       940-1100px                            │
│ Intro + six service cards with A08 glyphs                      │
├────────────────────────────────────────────────────────────────┤
│ S05 COMMENT ÇA MARCHE    900-1080px                            │
│ Intro + A09 four-step process + success-fee statement          │
├────────────────────────────────────────────────────────────────┤
│ S06 POUR QUI             760-900px                             │
│ Three sector cards + eligibility threshold                     │
├────────────────────────────────────────────────────────────────┤
│ S07 POURQUOI SAVEWATT    760-940px dark                        │
│ Six differentiators + optional A11 recovery ledger             │
├────────────────────────────────────────────────────────────────┤
│ S08 RÉSULTATS            680-820px                             │
│ Metric context + illustrative result table                     │
├────────────────────────────────────────────────────────────────┤
│ S09 FAQ                  content-driven                        │
│ 8 open Q&A blocks for users and search systems                 │
├────────────────────────────────────────────────────────────────┤
│ S10 FINAL CTA            620-760px dark                        │
│ Low-friction audit request + A14 trace line                    │
├────────────────────────────────────────────────────────────────┤
│ GLOBAL FOOTER            content-driven dark                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. GLOBAL HEADER

### Layout

| Property | Desktop | Mobile |
|---|---|---|
| Position | Sticky, top `16px` | Sticky, top `8px` |
| Width | `min(1280px, calc(100vw - 48px))` | `calc(100vw - 24px)` |
| Height | `72px` | `64px` |
| Surface | `#052C24` at 94% opacity | `#052C24` |
| Contents | Logo, nav, CTA | Logo, short CTA, menu |

### Navigation labels - French production

```text
Solution
Méthode
Secteurs
Résultats
FAQ
```

### English review

```text
Solution
Method
Sectors
Results
FAQ
```

### CTA

French: `Demander un audit gratuit`

English review: `Request a free audit`

Mobile short label: `Audit gratuit`

### Behavior

- Header becomes fully opaque after `40px` scroll.
- Active section receives a short current-green underline.
- CTA is always visible.
- Mobile menu opens as a full-width deep-green panel below the header.
- Minimum touch target: `44x44px`.

---

## 3. SECTION 01 - HERO

| Property | Value |
|---|---|
| Surface | Deep energy green `#052C24` |
| Desktop height | `min-height: 820px` |
| Mobile height | Content-driven, approximately `980-1160px` |
| Desktop layout | 12 columns; copy 1-7, visual 8-12 |
| Mobile layout | Copy, CTAs, trust line, visual |
| Asset | `A06` from `docs/visual-dna.md` |

### Kicker

**French production**

```text
AUDIT · RÉCUPÉRATION · OPTIMISATION
```

**English review**

```text
AUDIT · RECOVERY · OPTIMIZATION
```

### Headline H1

**French production**

```text
Récupérez ce que vos factures d'énergie vous ont coûté en trop.
```

**English review**

```text
Recover what your energy bills have cost you in excess.
```

### Subheadline

**French production**

```text
SaveWatt analyse jusqu'à cinq ans de factures d'électricité et de gaz, détecte les anomalies, récupère les montants indûment facturés et optimise durablement vos contrats. Audit gratuit, sans avance, avec des honoraires uniquement sur les gains effectivement obtenus.
```

**English review**

```text
SaveWatt reviews up to five years of electricity and gas invoices, identifies anomalies, recovers amounts billed in error, and sustainably optimizes your contracts. The audit is free, there is no upfront fee, and our fees apply only to gains actually achieved.
```

### CTAs

| Priority | French production | English review | Destination |
|---|---|---|---|
| Primary | `Demander mon audit gratuit` | `Request my free audit` | `#demande-audit` |
| Secondary | `Voir comment ça marche` | `See how it works` | `#methode` |

### Trust line

**French production**

```text
Bureau d'études indépendant · Paris · France
```

**English review**

```text
Independent energy-cost audit office · Paris · France
```

### Hero visual

Use `A06-hero-audit-desktop-fr` and `A06-hero-audit-mobile-fr`.

Desktop display:

- Width: `min(46vw, 620px)`
- Aspect ratio: `4 / 3`
- Object fit: `contain`
- No crop
- Align visual center to the vertical midpoint of the H1/subheadline block

Mobile display:

- Width: `100%`
- Aspect ratio: `4 / 5`
- Max width: `520px`
- Centered below trust line
- No desktop crop

### Required HTML callouts over the hero visual

Desktop:

```text
VOTRE FACTURE
ANOMALIE DÉTECTÉE
RÉCLAMATION AU FOURNISSEUR
MONTANT RÉCUPÉRÉ
```

English review:

```text
YOUR INVOICE
ANOMALY DETECTED
CLAIM TO THE SUPPLIER
AMOUNT RECOVERED
```

Callouts are live HTML, never baked into the image. Connect each label to its
corresponding object using a short leader line. Mobile uses the same labels in
top-to-bottom reading order. Keep the labels visible in the static state;
animation may reveal the route but must not be required for comprehension.

### Entrance motion

| Element | Delay | Duration | Effect |
|---|---:|---:|---|
| Kicker | `0ms` | `550ms` | opacity + `translateY(12px)` |
| H1 | `100ms` | `700ms` | opacity + `translateY(18px)` |
| Subheadline | `220ms` | `650ms` | opacity |
| CTAs | `320ms` | `550ms` | opacity + `translateY(10px)` |
| Visual | `250ms` | `850ms` | opacity + scale `0.985 -> 1` |
| Current path | `700ms` | `1400ms` | SVG line draw |

### Responsive guardrails

- H1 max 3 lines at `1280px`, 4 lines at `390px`.
- Do not place the visual beside the copy below `900px`.
- Keep CTAs full-width below `480px`.
- Never hide the hero visual on mobile.

---

## 4. SECTION 02 - REASSURANCE STRIP

| Property | Value |
|---|---|
| Surface | Deep energy surface `#0A3A30` |
| Layout | 4 columns desktop, 2x2 tablet, vertical mobile |
| Asset | None |
| Copy | Live HTML |

### Proof statements

#### Proof 1

French:

```text
0 € d'avance
Aucun frais de dossier.
```

English review:

```text
€0 upfront
No application or processing fee.
```

#### Proof 2

French:

```text
Jusqu'à 5 ans analysés
Selon l'historique disponible et les délais de prescription applicables.
```

English review:

```text
Up to 5 years reviewed
Depending on available history and applicable limitation periods.
```

#### Proof 3

French:

```text
Honoraires au résultat
SaveWatt est rémunéré sur les gains effectivement obtenus.
```

English review:

```text
Success-based fees
SaveWatt is paid from gains actually achieved.
```

#### Proof 4

French:

```text
Indépendant des fournisseurs
Notre mission est de défendre vos intérêts.
```

English review:

```text
Independent from suppliers
Our role is to defend your interests.
```

### Visual treatment

- Metric line in IBM Plex Mono.
- Explanation line in muted off-white.
- Hairline separators on desktop.
- No icons required.

---

## 5. SECTION 03 - LE CONSTAT

| Property | Value |
|---|---|
| Anchor | `#constat` |
| Surface | Warm limestone `#F5F1E8` |
| Desktop layout | Copy 5 columns, asset 7 columns |
| Mobile layout | Copy, anomaly cards, asset |
| Asset | `A07` anomaly atlas |

### Overline

French:

```text
01 — LE CONSTAT
```

English review:

```text
01 — THE PROBLEM
```

### Headline H2

French:

```text
Vos factures peuvent cacher des erreurs coûteuses.
```

English review:

```text
Your energy bills may be hiding costly errors.
```

### Lead paragraph

French:

```text
Index erronés, puissance mal calibrée, taxes mal appliquées, options tarifaires inadaptées ou contrats jamais renégociés : ces écarts passent souvent inaperçus, faute de temps et d'expertise pour contrôler chaque ligne.
```

English review:

```text
Incorrect meter readings, poorly calibrated subscribed power, misapplied taxes, unsuitable tariff options, or contracts that were never renegotiated can remain unnoticed when teams lack the time and specialist knowledge to inspect every line.
```

### Problem cards

#### Card 1

French title: `Erreurs de facturation`

French body:

```text
Index incohérents, doublons, abonnements non justifiés ou régularisations contestables peuvent augmenter la facture sans déclencher d'alerte interne.
```

English review:

```text
Inconsistent readings, duplicate charges, unjustified subscriptions, or questionable adjustments can increase the bill without triggering an internal warning.
```

#### Card 2

French title: `Puissance souscrite inadaptée`

French body:

```text
Une puissance trop élevée alourdit l'abonnement. Une puissance trop faible peut entraîner des dépassements. Dans les deux cas, le mauvais calibrage coûte.
```

English review:

```text
Too much subscribed power increases the fixed charge. Too little can create overrun penalties. Either way, poor calibration costs money.
```

#### Card 3

French title: `Taxes et TURPE mal appliqués`

French body:

```text
Accise, CTA, TURPE, exonérations et taux spécifiques forment un ensemble complexe où une mauvaise application peut durer plusieurs années.
```

English review:

```text
Excise duties, CTA, TURPE, exemptions, and specific rates form a complex system in which an error can continue for years.
```

#### Card 4

French title: `Contrats devenus obsolètes`

French body:

```text
Une offre reconduite sans revue, un tarif ancien ou une option mal adaptée peut maintenir durablement un niveau de dépense évitable.
```

English review:

```text
An automatically renewed offer, an outdated tariff, or an unsuitable option can preserve avoidable costs over the long term.
```

### Prescription callout

French:

```text
Jusqu'à cinq années d'historique peuvent être examinées selon la situation. Cet historique permet d'identifier les montants récupérables et les économies futures.
```

English review:

```text
Up to five years of history may be reviewed depending on the situation. That history helps identify both recoverable amounts and future savings.
```

### CTA

French: `Vérifier si mon organisation est concernée`

English review: `Check whether my organization may be affected`

### Asset placement

- Desktop source `1200x1200`, rendered at `min(48vw, 660px)`.
- Mobile source `1080x1080`, rendered full width.
- Use `contain`; do not crop labels.
- If generated labels are unreliable, use the text-free fallback and HTML overlay.

---

## 6. SECTION 04 - NOTRE SOLUTION

| Property | Value |
|---|---|
| Anchor | `#solution` |
| Surface | Warm limestone |
| Layout | Intro, then 3x2 service grid |
| Mobile | Single-column cards |
| Assets | `A08a-f` service glyphs |

### Overline

French: `02 — NOTRE SOLUTION`

English review: `02 — OUR SOLUTION`

### Headline H2

French:

```text
Nous récupérons le passé et optimisons la suite.
```

English review:

```text
We recover past losses and optimize what comes next.
```

### Intro

French:

```text
SaveWatt ne vend pas d'énergie. Nous analysons vos dépenses, défendons vos intérêts face aux fournisseurs et gestionnaires de réseau, puis sécurisons les économies obtenues dans la durée.
```

English review:

```text
SaveWatt does not sell energy. We analyze your expenditure, defend your interests with suppliers and network operators, and then protect the savings achieved over time.
```

### Service card 1 - Audit

French title: `Audit complet des factures`

French body:

```text
Analyse ligne par ligne de l'électricité et du gaz : abonnements, consommations, taxes, TURPE, options tarifaires et régularisations.
```

English review:

```text
Line-by-line review of electricity and gas invoices: subscriptions, consumption, taxes, TURPE, tariff options, and adjustments.
```

### Service card 2 - Recovery

French title: `Récupération des trop-perçus`

French body:

```text
Constitution des dossiers de réclamation et suivi des échanges jusqu'au remboursement effectif des sommes reconnues comme indues.
```

English review:

```text
Preparation of claims and management of the process through to reimbursement of amounts confirmed as incorrectly charged.
```

### Service card 3 - Power

French title: `Optimisation de la puissance`

French body:

```text
Recalibrage de la puissance souscrite et des options tarifaires à partir de votre consommation réelle afin de réduire les coûts inutiles.
```

English review:

```text
Recalibration of subscribed power and tariff options based on actual consumption to reduce unnecessary costs.
```

### Service card 4 - Contracts

French title: `Renégociation des contrats`

French body:

```text
Préparation des renouvellements, comparaison des offres et accompagnement à la décision, y compris dans les contextes de marchés publics.
```

English review:

```text
Preparation for renewals, offer comparison, and decision support, including public procurement contexts.
```

### Service card 5 - CEE

French title: `Valorisation des CEE`

French body:

```text
Identification des travaux éligibles et accompagnement dans la valorisation des Certificats d'Économies d'Énergie lorsque le dispositif est pertinent.
```

English review:

```text
Identification of eligible work and support in monetizing Energy Savings Certificates when the scheme is relevant.
```

### Service card 6 - Monitoring

French title: `Veille et suivi continu`

French body:

```text
Contrôle périodique des factures et alerte en cas de dérive afin que les économies ne disparaissent pas au prochain changement de contrat.
```

English review:

```text
Periodic invoice review and alerts when spending drifts, so savings are not lost at the next contract change.
```

### CTA

French: `Découvrir le périmètre de l'audit`

English review: `Explore the audit scope`

### Card layout

- Desktop: 3 columns, `gap: 1px` hairline grid or `24px` separated cards.
- Tablet: 2 columns.
- Mobile: 1 column.
- Glyph at top-left, title below, body max `44ch`.
- Card minimum height desktop: `300px`.

---

## 7. SECTION 05 - COMMENT ÇA MARCHE

| Property | Value |
|---|---|
| Anchor | `#methode` |
| Surface | Limestone inset `#E8E2D6` |
| Desktop layout | Intro + horizontal process |
| Mobile layout | Intro + vertical process |
| Asset | `A09` |

### Overline

French: `03 — LA MÉTHODE`

English review: `03 — THE METHOD`

### Headline H2

French:

```text
Vous transmettez les documents. Nous nous occupons du reste.
```

English review:

```text
You provide the documents. We handle the rest.
```

### Intro

French:

```text
La démarche est conçue pour mobiliser le moins possible vos équipes. Une facture récente suffit pour démarrer le pré-diagnostic ; l'historique complet peut être rassemblé ensuite.
```

English review:

```text
The process is designed to require as little time as possible from your teams. One recent invoice is enough to begin the initial review; the full history can be gathered afterward.
```

### Step 1

French label: `ÉTAPE 1 · VOUS`

French title: `Transmission des factures et contrats`

French body:

```text
Vous nous communiquez une facture récente, puis les factures et contrats disponibles. Nous vous indiquons précisément les pièces utiles à l'analyse.
```

English review:

```text
You send us one recent invoice, followed by the invoices and contracts available. We tell you exactly which documents are useful for the review.
```

### Step 2

French label: `ÉTAPE 2 · SAVEWATT`

French title: `Audit et diagnostic chiffré`

French body:

```text
Nous contrôlons les postes de facturation, les taxes, la puissance, les options et les conditions contractuelles, puis nous présentons les anomalies et leviers identifiés.
```

English review:

```text
We review billing items, taxes, subscribed power, options, and contractual conditions, then present the anomalies and opportunities identified.
```

### Step 3

French label: `ÉTAPE 3 · SAVEWATT`

French title: `Réclamation et récupération`

French body:

```text
Lorsque des montants indus sont confirmés, nous préparons les réclamations et suivons les échanges avec les acteurs concernés jusqu'à leur résolution.
```

English review:

```text
When incorrect charges are confirmed, we prepare the claims and manage discussions with the relevant parties through to resolution.
```

### Step 4

French label: `ÉTAPE 4 · ENSEMBLE`

French title: `Optimisation et suivi durable`

French body:

```text
Nous ajustons les paramètres et contrats concernés, puis organisons le suivi nécessaire pour préserver les économies dans le temps.
```

English review:

```text
We adjust the relevant parameters and contracts, then organize the monitoring needed to preserve savings over time.
```

### Success-fee statement

French:

```text
Notre rémunération est liée aux résultats. Aucun honoraire de récupération n'est dû si aucun gain n'est effectivement obtenu.
```

English review:

```text
Our remuneration is tied to results. No recovery fee is due when no gain is actually achieved.
```

### CTA

French: `Recevoir mon pré-diagnostic`

English review: `Receive my initial assessment`

### Asset behavior

- Desktop uses `A09` 2:1 below the intro.
- Mobile uses the dedicated 3:4 vertical composition.
- Do not rotate or crop the desktop flow.
- On implementation, labels may be HTML overlays for perfect French typography.

### Motion

- Process path draws once on viewport entry.
- Each node validates after the path reaches it.
- Mobile uses the same sequence vertically.
- Reduced motion shows the complete static path.

---

## 8. SECTION 06 - À QUI S'ADRESSE SAVEWATT

| Property | Value |
|---|---|
| Anchor | `#secteurs` |
| Surface | Warm limestone |
| Layout | Three sector cards |
| Assets | `A10a-c` |

### Overline

French: `04 — POUR QUI`

English review: `04 — WHO WE HELP`

### Headline H2

French:

```text
Pour les organisations dont chaque point de dépense énergétique compte.
```

English review:

```text
For organizations where every point of energy expenditure matters.
```

### Intro

French:

```text
SaveWatt intervient lorsque les volumes, le nombre de sites ou la complexité contractuelle justifient une analyse spécialisée.
```

English review:

```text
SaveWatt works where energy volumes, the number of sites, or contractual complexity justify specialist analysis.
```

### Sector 1

French title: `Collectivités, communes et EPCI`

French body:

```text
Bâtiments publics, écoles, éclairage, équipements sportifs, marchés d'énergie et groupements de commandes.
```

English review:

```text
Public buildings, schools, lighting, sports facilities, energy contracts, and grouped procurement.
```

French link: `Voir la solution pour les collectivités`

### Sector 2

French title: `Entreprises et parcs multi-sites`

French body:

```text
Bureaux, commerces, hôtels, résidences, copropriétés et portefeuilles immobiliers répartis sur plusieurs sites.
```

English review:

```text
Offices, retail sites, hotels, residences, condominiums, and property portfolios spread across multiple locations.
```

French link: `Voir la solution multi-sites`

### Sector 3

French title: `Industrie et logistique`

French body:

```text
Sites de production, entrepôts, plateformes logistiques et activités où la puissance et les profils de consommation pèsent fortement sur les coûts.
```

English review:

```text
Production sites, warehouses, logistics platforms, and operations where subscribed power and consumption profiles strongly affect costs.
```

French link: `Évaluer mon potentiel`

### Eligibility callout

French:

```text
Votre facture dépasse environ 1 500 € par mois ? Le potentiel d'analyse peut déjà justifier un pré-diagnostic.
```

English review:

```text
Does your energy bill exceed roughly €1,500 per month? The potential may already justify an initial assessment.
```

Qualification:

```text
Seuil indicatif. La pertinence de l'audit dépend du profil de consommation, des contrats et de l'historique disponible.
```

### Responsive

- Desktop: 3 equal cards.
- Tablet: 2 + 1.
- Mobile: single column.
- Glyphs remain visible at `112-128px`.
- Do not use horizontal scroll for primary sector cards.

---

## 9. SECTION 07 - POURQUOI SAVEWATT

| Property | Value |
|---|---|
| Anchor | `#pourquoi` |
| Surface | Deep energy green |
| Layout | 7/5 split or full grid if A11 omitted |
| Asset | `A11` optional |

### Overline

French: `05 — POURQUOI SAVEWATT`

English review: `05 — WHY SAVEWATT`

### Headline H2

French:

```text
Un intérêt aligné sur le vôtre.
```

English review:

```text
An interest aligned with yours.
```

### Intro

French:

```text
Notre modèle, notre indépendance et notre méthode sont conçus pour une seule finalité : réduire les dépenses injustifiées et rendre les économies mesurables.
```

English review:

```text
Our model, independence, and method are designed around one goal: reducing unjustified expenditure and making savings measurable.
```

### Differentiator 1

French title: `Sans risque financier initial`

French body:

```text
Pas d'avance ni de frais de dossier pour engager l'analyse.
```

English review:

```text
No upfront payment or processing fee to begin the analysis.
```

### Differentiator 2

French title: `100 % indépendant`

French body:

```text
SaveWatt ne vend ni énergie ni contrat fournisseur.
```

English review:

```text
SaveWatt sells neither energy nor supplier contracts.
```

### Differentiator 3

French title: `Expertise réglementaire`

French body:

```text
Analyse des mécanismes de facturation, du TURPE, des taxes, des contrats et des dispositifs applicables.
```

English review:

```text
Analysis of billing mechanisms, TURPE, taxes, contracts, and applicable schemes.
```

### Differentiator 4

French title: `Zéro charge inutile pour vos équipes`

French body:

```text
Nous préparons les analyses, dossiers et échanges nécessaires.
```

English review:

```text
We prepare the analyses, claims, and necessary communications.
```

### Differentiator 5

French title: `Résultats documentés`

French body:

```text
Les anomalies, remboursements et optimisations sont suivis dans un reporting clair.
```

English review:

```text
Anomalies, reimbursements, and optimizations are tracked in clear reporting.
```

### Differentiator 6

French title: `Confidentialité des données`

French body:

```text
Les factures, contrats et informations transmis sont traités dans un cadre défini et sécurisé.
```

English review:

```text
Invoices, contracts, and submitted information are handled within a defined and secure framework.
```

### CTA

French: `Parler à un expert SaveWatt`

English review: `Speak with a SaveWatt expert`

### Asset

- Desktop: `A11` rendered at max `480px` wide.
- Mobile: omit if it pushes the CTA below an unreasonable scroll depth.
- Asset is supportive, never a replacement for the six proof points.

---

## 10. SECTION 08 - RÉSULTATS

| Property | Value |
|---|---|
| Anchor | `#resultats` |
| Surface | Warm limestone |
| Layout | Headline + metrics + responsive table |
| Asset | Optional `A12` |

### Overline

French: `06 — EXEMPLES DE POTENTIEL`

English review: `06 — EXAMPLES OF POTENTIAL`

### Headline H2

French:

```text
Des économies qui doivent pouvoir se lire, se vérifier et se suivre.
```

English review:

```text
Savings should be readable, verifiable, and trackable.
```

### Intro

French:

```text
Le potentiel varie selon les volumes, les anomalies, les contrats et l'historique disponible. Les exemples ci-dessous illustrent des profils types et ne constituent pas une garantie de résultat.
```

English review:

```text
Potential varies according to volumes, anomalies, contracts, and available history. The examples below illustrate typical profiles and are not a guarantee of results.
```

### Illustrative table

| Profil | Facture annuelle | Montant récupéré | Économie |
|---|---:|---:|---:|
| Commune d'environ 8 000 habitants | `290 000 €` | `41 000 €` | `-18 %` |
| Site industriel | `540 000 €` | `96 000 €` | `-24 %` |
| Groupe hôtelier | `180 000 €` | `22 500 €` | `-16 %` |
| Copropriété tertiaire | `96 000 €` | `14 800 €` | `-21 %` |

### Required qualification

French production:

```text
Exemples illustratifs issus de profils types présentés dans la documentation SaveWatt. Les résultats réels dépendent de l'analyse des factures, contrats et données disponibles. À remplacer par des cas documentés avant toute présentation comme résultats clients.
```

English review:

```text
Illustrative examples based on typical profiles presented in SaveWatt documentation. Actual results depend on the invoices, contracts, and data available. Replace with documented cases before presenting them as client results.
```

### CTA

French: `Estimer mon potentiel d'économie`

English review: `Estimate my savings potential`

### Responsive table behavior

- Desktop: standard four-column table.
- Tablet: same table with tighter columns.
- Mobile: transform each row into a stacked result card.
- Do not force a horizontal-scroll-only experience for the primary proof.
- Keep the qualification visible immediately below the examples.

---

## 11. SECTION 09 - FAQ

| Property | Value |
|---|---|
| Anchor | `#faq` |
| Surface | Limestone inset |
| Layout | Open stacked Q&A blocks, max width `840px` |
| Asset | `A13` marker |

### Overline

French: `07 — QUESTIONS FRÉQUENTES`

English review: `07 — FREQUENTLY ASKED QUESTIONS`

### Headline H2

French:

```text
Ce qu'il faut savoir avant de commencer.
```

English review:

```text
What you need to know before getting started.
```

### FAQ 1

French question:

```text
Quels documents faut-il transmettre ?
```

French answer:

```text
Une facture récente suffit pour commencer le pré-diagnostic. Nous vous indiquerons ensuite les factures, contrats et annexes utiles pour approfondir l'analyse.
```

English review:

```text
One recent invoice is enough to begin the initial assessment. We will then tell you which invoices, contracts, and supporting documents are useful for the deeper review.
```

### FAQ 2

French question:

```text
Faut-il disposer immédiatement de cinq années de factures ?
```

French answer:

```text
Non. L'analyse peut démarrer avec les documents disponibles. L'historique complémentaire est rassemblé ensuite lorsque son examen est pertinent.
```

English review:

```text
No. The review can begin with the documents available. Additional history can be gathered later when its analysis is relevant.
```

### FAQ 3

French question:

```text
Combien coûte l'audit ?
```

French answer:

```text
Le pré-diagnostic et l'audit initial sont présentés comme gratuits et sans engagement. Les conditions précises de rémunération au résultat doivent être définies dans la proposition contractuelle.
```

English review:

```text
The initial assessment and audit are presented as free and without commitment. The precise success-fee conditions must be defined in the contractual proposal.
```

### FAQ 4

French question:

```text
Que se passe-t-il si aucune économie n'est identifiée ?
```

French answer:

```text
Si aucun gain récupérable ou levier pertinent n'est confirmé, aucun honoraire de récupération au résultat n'est dû selon le modèle présenté.
```

English review:

```text
If no recoverable gain or relevant opportunity is confirmed, no success-based recovery fee is due under the model presented.
```

### FAQ 5

French question:

```text
Qui gère les réclamations auprès des fournisseurs ?
```

French answer:

```text
SaveWatt prépare les dossiers, structure les justificatifs et suit les échanges nécessaires avec les fournisseurs ou gestionnaires concernés.
```

English review:

```text
SaveWatt prepares the claims, organizes the supporting evidence, and manages the necessary discussions with the relevant suppliers or network operators.
```

### FAQ 6

French question:

```text
À quelles organisations le service s'adresse-t-il ?
```

French answer:

```text
Le service vise principalement les collectivités, entreprises, sites industriels et organisations multi-sites dont les dépenses énergétiques justifient une analyse spécialisée.
```

English review:

```text
The service is mainly intended for public bodies, businesses, industrial sites, and multi-site organizations whose energy expenditure justifies specialist analysis.
```

### FAQ 7

French question:

```text
Comment les données de facturation sont-elles protégées ?
```

French answer:

```text
Le formulaire et la proposition contractuelle doivent préciser les finalités du traitement, les destinataires, la durée de conservation et les droits applicables. Une notice de confidentialité doit apparaître directement sous le formulaire.
```

English review:

```text
The form and contractual proposal must state the processing purposes, recipients, retention period, and applicable rights. A privacy notice must appear directly below the form.
```

### FAQ 8

French question:

```text
Combien de temps faut-il pour recevoir un premier retour ?
```

French answer:

```text
Le délai de réponse doit être confirmé par SaveWatt avant publication. Le formulaire affichera ensuite un engagement réaliste, par exemple un premier retour sous quelques jours ouvrés.
```

English review:

```text
SaveWatt must confirm the response time before publication. The form can then display a realistic commitment, such as an initial response within a few business days.
```

### SEO behavior

- Keep answers present in server-rendered HTML.
- Accordion behavior is allowed only if content remains in the DOM.
- Do not depend on FAQ rich-result eligibility.

---

## 12. SECTION 10 - FINAL CTA & AUDIT REQUEST

| Property | Value |
|---|---|
| Anchor | `#demande-audit` |
| Surface | Deep energy green |
| Layout | Copy 5 columns, form 7 columns desktop |
| Mobile | Copy, form, support visual |
| Asset | `A14` optional background support |

### Overline

French:

```text
08 — PASSEZ À L'ACTION
```

English review:

```text
08 — TAKE THE NEXT STEP
```

### Headline H2

French:

```text
Découvrez ce que vous pouvez récupérer.
```

English review:

```text
Find out what you may be able to recover.
```

### Body

French:

```text
Commencez avec quelques informations et, si vous le souhaitez, une facture récente. SaveWatt vous recontactera pour qualifier le périmètre et organiser le pré-diagnostic, sans engagement.
```

English review:

```text
Start with a few details and, if you choose, one recent invoice. SaveWatt will contact you to qualify the scope and arrange the initial assessment, without commitment.
```

### Form fields - French production

```text
Nom et prénom
Organisation
Fonction
E-mail professionnel
Téléphone
Ville / code postal
Type d'organisation
Nombre de sites
Dépense énergétique mensuelle estimée
Message
Ajouter une facture récente (facultatif)
```

### Organization type options

```text
Collectivité / commune
EPCI / établissement public
Entreprise multi-sites
Industrie / logistique
Hôtellerie / résidence
Copropriété / syndic
Autre
```

### Submit CTA

French:

```text
Demander mon audit gratuit
```

English review:

```text
Request my free audit
```

### Form reassurance

French:

```text
Vous pouvez commencer sans joindre de document. Une facture récente pourra être transmise ensuite.
```

English review:

```text
You can begin without attaching a document. A recent invoice can be sent later.
```

### Privacy microcopy

French production placeholder:

```text
Les informations transmises sont utilisées pour traiter votre demande et vous recontacter. Consultez notre politique de confidentialité pour connaître vos droits et les modalités de traitement.
```

English review:

```text
The information submitted is used to process your request and contact you. See our privacy policy for your rights and details of how the data is handled.
```

### Success state

French:

```text
Votre demande a bien été transmise.
Un membre de l'équipe SaveWatt vous recontactera selon le délai indiqué.
```

English review:

```text
Your request has been submitted.
A member of the SaveWatt team will contact you within the stated timeframe.
```

### Error state

French:

```text
La demande n'a pas pu être envoyée. Vérifiez les champs indiqués ou écrivez-nous à contact@savewatt.fr.
```

English review:

```text
The request could not be sent. Check the highlighted fields or email us at contact@savewatt.fr.
```

### Responsive form behavior

- Two columns only above `768px`.
- Single column on mobile.
- File upload appears after the contact details.
- Submit button full width on mobile.
- No modal form for the primary conversion.

---

## 13. GLOBAL FOOTER

### Column 1 - Brand

French:

```text
SaveWatt
Bureau d'études indépendant en optimisation énergétique.
```

English review:

```text
SaveWatt
Independent energy-cost optimization office.
```

### Column 2 - Navigation

```text
Solution
Méthode
Secteurs
Résultats
FAQ
Contact
```

### Column 3 - Contact

```text
SaveWatt
8 rue de Belloy
75008 Paris
contact@savewatt.fr
Téléphone : à confirmer
```

### Column 4 - Legal

```text
Mentions légales
Politique de confidentialité
Gestion des cookies
Plan du site
```

### Legal identity placeholders

Do not ship placeholders. Confirm before launch:

- legal company name
- legal form
- share capital where required
- SIREN/SIRET
- VAT number
- publication director
- hosting provider
- contact phone

---

## 14. MOBILE LAYOUT SUMMARY

All sections stack below `768px`.

- Header: compact logo, short CTA, menu.
- Hero: copy first, then dedicated 4:5 visual.
- Reassurance: vertical or 2x2, no horizontal scrolling.
- Problem: copy and four cards before the square visual.
- Solution: one service card per row.
- Process: dedicated vertical 3:4 illustration.
- Sectors: one card per row.
- Why SaveWatt: proof points first; optional support asset after.
- Results: rows become cards.
- FAQ: full-width open blocks.
- Final CTA: copy then single-column form.
- Footer: brand, contact, links, legal.

### Mobile image constraints

- Use the dedicated mobile file where specified.
- Never use `object-fit: cover` for technical diagrams.
- Use `object-fit: contain`.
- Give images intrinsic width and height.
- Keep generated labels at least `18px` in 1080px source assets.

---

## 15. SEO, AEO & METADATA

### Title

```text
Audit de factures d'énergie et récupération | SaveWatt
```

### Meta description

```text
SaveWatt audite vos factures d'électricité et de gaz, récupère les trop-perçus et optimise vos contrats. Audit gratuit, honoraires au résultat.
```

### H1

```text
Récupérez ce que vos factures d'énergie vous ont coûté en trop.
```

### Canonical

```text
https://www.savewatt.fr/
```

Confirm the final domain before implementation.

### OG

- Asset: `A05`
- Locale: `fr_FR`
- Width: `1200`
- Height: `630`

### Recommended schema

- `Organization`
- `LocalBusiness` only if the Paris office qualifies as a public-facing business location
- `WebSite`
- `Service`
- `BreadcrumbList` on inner pages

### Answer-first definition block

Add as visible HTML below the reassurance strip or inside the solution intro:

French:

```text
SaveWatt est un bureau d'études indépendant qui analyse les factures d'électricité et de gaz, identifie les surfacturations, accompagne la récupération des montants indus et optimise les contrats énergétiques des collectivités et entreprises.
```

English review:

```text
SaveWatt is an independent energy-cost audit office that reviews electricity and gas invoices, identifies overbilling, supports the recovery of incorrectly charged amounts, and optimizes energy contracts for public bodies and businesses.
```

---

## 16. CONTENT GOVERNANCE

Before launch, approve:

- the exact success-fee wording
- the response-time promise
- all savings and recovery examples
- the use of the `1 500 € / mois` qualification threshold
- legal identity details
- privacy and retention language
- whether document upload is available at launch
- any customer logo, testimonial, or case study

### Review cadence

- Commercial copy: quarterly
- Regulatory and tax claims: after any relevant change
- Legal pages: whenever processing, hosting, or company details change
- Results/case studies: on every new approved case

---

## 17. BUILD ACCEPTANCE CHECKLIST

### Copy

- [ ] French production copy matches this document
- [ ] English review text is not rendered publicly
- [ ] No placeholder phone, SIREN, or legal detail ships
- [ ] Every illustrative result has its qualification

### Layout

- [ ] Desktop follows the specified grid
- [ ] Mobile follows the specified section order
- [ ] H1 remains readable at 375px
- [ ] Primary CTA remains visible and consistent

### Assets

- [ ] `docs/visual-dna.md` is the only asset prompt source
- [ ] Dedicated desktop/mobile masters are used
- [ ] No technical diagram is cropped
- [ ] French labels are correct
- [ ] Alt text is French

### Interaction

- [ ] Reduced motion works
- [ ] Forms are keyboard accessible
- [ ] Touch targets are at least 44px
- [ ] Success and error states are explicit

### Trust

- [ ] Contact details are real
- [ ] Privacy notice appears under the form
- [ ] Legal pages are linked in the footer
- [ ] No unsupported metric or customer claim is displayed
