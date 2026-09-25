# PROMPT — Plateforme de gestion de régies commerciales énergie (fournisseur partenaire : Symphonics)

> À coller tel quel dans l'outil de développement (Claude Code, Lovable, Bolt, Cursor…). Nom de code provisoire de l'application : **[NOM_APP]** (à définir — voir « Points ouverts »).

---

## 0. Rôle et consignes

Tu es un architecte logiciel senior et un développeur full-stack expert en SaaS B2B multi-tenant, en sécurité applicative (OWASP ASVS niveau 2) et en marché de l'électricité/gaz B2B en France (C2/C3/C4/C5, TURPE, accise, CTA, CEE, capacité).

Construis une application web de production, pas un prototype. Pour chaque module : modèle de données, API, écrans, règles d'accès, tests automatisés. Avant de coder, produis : (1) le schéma de base de données, (2) la matrice des droits, (3) la liste des écrans, (4) le plan de livraison par lots. Signale toute ambiguïté au lieu de l'inventer.

## 1. Contexte métier

- La plateforme est opérée par un **Opérateur** (AX TECH, super-administrateur).
- Le fournisseur d'énergie partenaire est **Symphonics** (fourniture d'électricité, segments C2 à C5). Symphonics émet des **propositions de prix** par PDL (prix électron par cadran, abonnement, CEE, capacité, budget prévisionnel, durée).
- L'Opérateur ouvre des **Master régies** (ex. AX TECH, Solar Finance…). Chaque master peut ouvrir des **sous-régies** (niveaux illimités), qui créent des **équipes** et des **apporteurs d'affaires**.
- Les commerciaux collectent la facture actuelle du client, la plateforme l'analyse, la compare à l'offre Symphonics majorée de la marge définie, génère l'offre client, puis le contrat part en signature électronique (Yousign) et est transmis à Symphonics.
- Chaque mois, Symphonics remonte par API la consommation facturée par contrat ; la plateforme calcule les commissions et génère les factures de l'Opérateur/des masters vers Symphonics, puis la cascade de commissions vers sous-régies et apporteurs.

## 2. Stack technique (imposée sauf objection argumentée)

- Front : Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, responsive mobile d'abord pour les apporteurs.
- Back : API Node.js TypeScript (NestJS ou routes Next.js structurées en couches domaine/service/repository).
- Base : PostgreSQL ≥ 15 avec **Row Level Security** activée sur toutes les tables métier, extension `ltree` pour l'arborescence des organisations.
- ORM : Drizzle (compatible RLS via `SET LOCAL app.org_path`, `app.user_id`, `app.role`).
- Stockage fichiers : S3 compatible hébergé en UE, chiffrement serveur + chiffrement applicatif des pièces sensibles.
- Files d'attente : BullMQ/Redis (OCR, webhooks, génération PDF, facturation mensuelle).
- PDF : génération via HTML → PDF (Playwright). Factures au format **Factur-X**.
- Hébergement : UE uniquement (France de préférence), environnements dev / staging / prod séparés, IaC.
- Observabilité : logs structurés JSON, Sentry, métriques, alertes.

## 3. Hiérarchie multi-tenant et cloisonnement (cœur du système)

### 3.1 Modèle d'organisation
Table `organizations` : `id, parent_id, path (ltree), type (OPERATOR | MASTER | SUB_REGIE | TEAM), legal_name, siren, siret, tva, adresse, iban_chiffré, logo, charte (couleurs), workflow_id, commission_grid_id, status, created_at`.

- Une organisation voit **elle-même et ses descendants**, jamais ses sœurs, jamais les données de ses ancêtres (sauf éléments explicitement partagés : modèles de documents, grilles de prix plafond).
- Un master ne voit jamais un autre master. Une sous-régie ne voit jamais une autre sous-régie, même sœur.
- Un **apporteur** ne voit que ses propres clients, offres, contrats et commissions.
- Un **manager d'équipe** voit les données de son équipe uniquement.
- Le cloisonnement est garanti **en base (RLS)**, pas seulement dans le code. Toute requête sans contexte d'organisation échoue.
- Écrire une suite de tests d'isolation : pour chaque rôle et chaque ressource, vérifier qu'un utilisateur A ne peut ni lire, ni modifier, ni deviner (IDs = UUID v7, jamais séquentiels) les données d'une branche B. Ces tests bloquent le déploiement.

### 3.2 Rôles (RBAC + portée hiérarchique)
| Rôle | Portée | Droits principaux |
|---|---|---|
| SUPER_ADMIN | Plateforme | Tout, création de masters, paramétrage Symphonics, journal d'audit global |
| OPERATOR_FINANCE | Plateforme | Facturation Symphonics, rapprochements, exports comptables |
| MASTER_ADMIN | Son master + descendants | Création sous-régies/équipes/utilisateurs, workflows, grilles de marge et commissions, modèles de documents |
| MASTER_BACKOFFICE | Son master + descendants | Validation des dossiers, contrôle des pièces, transmission fournisseur |
| SUB_REGIE_ADMIN | Sa sous-régie + descendants | Idem MASTER_ADMIN dans les limites fixées par le parent |
| TEAM_MANAGER | Son équipe | Suivi pipeline, réaffectation de clients dans l'équipe |
| APPORTEUR | Ses propres dossiers | Création client, dépôt facture, offre, envoi signature, suivi commissions |
| READ_ONLY / AUDITEUR | Portée attribuée | Lecture seule |
| SUPPLIER_API (Symphonics) | Contrats qui lui sont transmis | Accès API uniquement, aucun accès interface |
| CLIENT | Son dossier | Portail : consultation offre, signature, dépôt RIB/pièces |

- Permissions fines (`resource:action`) combinables en rôles personnalisés par master.
- Un parent peut restreindre ce qu'un enfant a le droit de paramétrer (ex. marge max, étapes obligatoires).
- **Impersonation** (se connecter « en tant que ») réservée SUPER_ADMIN / MASTER_ADMIN sur leur branche, avec bandeau visible, motif obligatoire et trace d'audit.

## 4. Sécurité, authentification, conformité

### 4.1 Authentification
- Mots de passe : Argon2id (paramètres OWASP), 12 caractères minimum, contrôle contre les listes de mots de passe compromis (HIBP k-anonymity), pas de règles de composition absurdes, pas d'expiration forcée sauf compromission.
- **MFA obligatoire** pour tous les rôles sauf CLIENT : TOTP et passkeys/WebAuthn ; codes de secours à usage unique.
- Invitation par e-mail avec lien signé à usage unique (expiration 72 h) ; aucune création de mot de passe par un administrateur.
- Réinitialisation : lien unique 30 min, invalidation de toutes les sessions à la réinitialisation, message identique que le compte existe ou non.
- Sessions : cookies `HttpOnly`, `Secure`, `SameSite=Lax`, rotation à la connexion et à l'élévation de privilèges, expiration d'inactivité 30 min (back-office) / 8 h max absolue, liste des sessions actives révocables.
- Protection force brute : limitation de débit par IP et par compte, verrouillage progressif, alerte e-mail sur connexion depuis un nouvel appareil.
- SSO SAML/OIDC optionnel par master (Google Workspace, Microsoft Entra).
- Désactivation d'un utilisateur = révocation immédiate des sessions et jetons ; réaffectation obligatoire de son portefeuille.

### 4.2 Application
- OWASP ASVS niveau 2 et Top 10 : validation d'entrée (Zod) côté serveur, requêtes paramétrées, CSP stricte, en-têtes de sécurité (HSTS, X-Frame-Options, Referrer-Policy), protection CSRF, contrôle d'accès vérifié à chaque requête.
- Téléversements : types MIME vérifiés par contenu, taille max, antivirus (ClamAV), URLs de téléchargement signées à durée courte.
- Chiffrement : TLS 1.2+ partout ; au repos AES-256 ; **chiffrement applicatif par enveloppe (KMS)** pour IBAN, pièces d'identité, RIB, clés API.
- Secrets dans un coffre (jamais dans le code ni les variables versionnées), rotation planifiée.
- Journal d'audit **immuable** (append-only, chaînage par hash) : connexions, consultations de pièces sensibles, modifications de prix/marges, changements de droits, exports, impersonations.
- Sauvegardes chiffrées quotidiennes, rétention 30 jours, test de restauration mensuel, PRA documenté (RPO 24 h, RTO 4 h).
- Tests d'intrusion avant mise en production puis annuels ; scan de dépendances en CI.

### 4.3 RGPD et réglementaire
- Registre des traitements, mentions d'information, bases légales, DPA avec Symphonics, Yousign et l'hébergeur.
- Minimisation : pièce d'identité et RIB collectés seulement si l'étape est activée dans le workflow.
- Durées de conservation paramétrables (ex. pièce d'identité supprimée X jours après validation fournisseur ; contrats et factures 10 ans) avec purge automatique et preuve de purge.
- Export et suppression des données d'un client sur demande.
- Règles spécifiques aux micro-entreprises en fourniture d'énergie (Code de la consommation / Code de l'énergie) : champ « effectif » et « CA » sur le client, affichage des mentions et délais applicables — **règles exactes à faire valider par un juriste**, prévoir un moteur de règles paramétrable.
- Facturation électronique : factures émises en Factur-X, prêtes à être transmises via une plateforme agréée (PA) ; champ SIREN obligatoire.

## 5. Moteur de workflows par société

- Chaque master (et sous-régie si autorisé) configure son workflow dans un éditeur visuel : étapes, ordre, conditions, pièces obligatoires, validations, notifications, délais (SLA), actions automatiques.
- Versionnement des workflows : un dossier reste sur la version sous laquelle il a été créé.
- Workflow par défaut :
  1. Prospect créé
  2. Facture(s) actuelle(s) déposée(s)
  3. Analyse automatique + validation humaine des données extraites
  4. Demande de prix Symphonics (API ou import PDF)
  5. Proposition Symphonics reçue
  6. Offre client générée (marge appliquée) + comparatif avant/après
  7. Validation interne (si marge hors grille ou montant > seuil)
  8. Envoi en signature Yousign
  9. Signé → contrôle back-office des pièces
  10. Transmis à Symphonics
  11. Accepté / refusé par Symphonics (motif)
  12. Actif (date de début de fourniture)
  13. En facturation mensuelle
  14. Échéance proche (alertes) → renouvellement
  15. Résilié / échu / perdu (motif obligatoire)
- Transitions déclenchant webhooks, e-mails, SMS, tâches assignées.
- Tableau Kanban et vue liste par étape, filtres par organisation, équipe, apporteur, segment, date d'échéance.

## 6. Référentiel clients, sites et contrats

- `clients` : raison sociale, SIREN/SIRET (auto-complétion API Sirene INSEE), NAF, effectif, CA, adresse, contacts, organisation propriétaire, apporteur.
- `sites` : adresse, **PDL/PRM (14 chiffres, contrôle de format)**, PCE pour le gaz, segment (C2/C3/C4/C5), tarif d'acheminement (ex. BT > 36 kVA courte utilisation), type de compteur, puissances souscrites par cadran, identifiant de comptage.
- `current_contracts` (contrat en place) : fournisseur, nom d'offre, référence contrat, date de souscription, date d'échéance, reconduction tacite (oui/non, durée), préavis de résiliation, prix par cadran, abonnement, services annexes facturés.
- `supplier_offers` (propositions Symphonics) : PDL, période de fourniture, date de validité, consommation prévisionnelle par cadran, puissances saisie/conseillée, prix électron par cadran, abonnement, CEE €/MWh, puissance et prix capacité, budget prévisionnel détaillé, PDF source.
- `client_offers` : offre supplier liée, marge par cadran (€/MWh) ou globale, prix finaux, budget client, statut, PDF généré.
- `contracts` (signés) : offre client, Yousign IDs, dates, statut Symphonics, identifiant contrat Symphonics.
- Un client peut avoir plusieurs sites ; une offre peut couvrir plusieurs sites (offre multisite).

## 7. Analyse de facture et outil comparatif avant / après

### 7.1 Extraction automatique
- Dépôt PDF/photo (multi-fichiers). Pipeline : extraction texte (pdf) → OCR si scan → **extraction structurée par LLM (API Claude) avec schéma JSON strict** → score de confiance par champ → écran de validation humaine avec le PDF à côté et les champs surlignés.
- Modèles de reconnaissance par fournisseur (EDF, Engie, TotalEnergies, Alpiq, Ekwateur, Vattenfall, Octopus…), extensibles.
- Champs à extraire au minimum :
  - Fournisseur, n° et date de facture, période de consommation, compte de facturation, SIREN
  - PDL, adresse du site, segment/tarif d'acheminement, puissance souscrite et puissances atteintes par cadran
  - Nom de l'offre, référence contrat, **date de souscription, date d'échéance, reconduction**
  - Index début/fin et consommation par cadran (HPH, HCH, HPE, HCE, ou HP/HC, ou base ; pointe si C2/C3)
  - **Prix unitaire HT par cadran**, abonnement, services annexes
  - Acheminement (détail des composantes), accise, CTA, TVA, totaux HT/TTC
  - Historique de consommation (graphique mensuel) quand présent
- Contrôles automatiques : cohérence index × prix = montant, somme des lignes = total, taux d'accise en vigueur, taux de TVA, dépassements de puissance, date d'échéance passée alors que la facturation continue (→ drapeau « reconduction tacite probable, vérifier la date réelle »).

### 7.2 Fiche « contrat actuel » affichée automatiquement
Carte récapitulative : fournisseur, offre, **date de fin de contrat** (et compte à rebours), coût HP et HC (€/MWh) par saison, abonnement, **dernière facture** (montant, période, lien PDF), consommation annuelle reconstituée, puissance souscrite vs atteinte.

### 7.3 Comparateur
- Entrées : contrat actuel (extrait) + proposition Symphonics + marge.
- Calcul sur la consommation prévisionnelle annuelle par cadran (issue de Symphonics ou reconstituée depuis l'historique).
- Comparaison **à périmètre identique** : l'utilisateur indique si le prix actuel inclut CEE et capacité (par défaut : oui pour une offre de marché) ; le prix Symphonics comparé = électron + CEE + capacité (+ marge).
- Taxes et acheminement affichés mais neutralisés (identiques quel que soit le fournisseur), sauf changement de puissance souscrite.
- Sorties : tableau par cadran (prix actuel, prix proposé, écart €/MWh, volume, gain €/an), abonnement, services annexes supprimables, **économie annuelle et sur la durée du contrat**, en HT et TTC, graphiques avant/après.
- Alertes : cadran manquant dans la facture fournie (ex. prix hiver absent si facture d'été → demander une facture d'hiver), prix HC proposé supérieur au HP, offre fournisseur expirée ou expirant sous 48 h, puissance atteinte = puissance souscrite.
- Export PDF à la charte du master (le client ne voit jamais les prix d'achat Symphonics ni la marge).

### 7.4 Cas de test obligatoire (données réelles fournies)
Facture EDF du 11/09/2026, client JOSH, PDL 50066947359734, C4, 37 kW :
- HPE 19,095 c€/kWh (3 236 kWh), HCE 11,354 c€/kWh (536 kWh), abonnement 32,50 €/mois, services SuiviConso 29,17 €/mois + assistance 15,00 €/mois
- Contrat souscrit le 07/03/2023, échéance imprimée 06/03/2025 alors que la facturation continue → drapeau reconduction.

Proposition Symphonics (valable au 16/09/2026), période 07/03/2027–06/03/2029 :
- Volumes : HPH 29,00 / HCH 6,01 / HPE 23,98 / HCE 3,39 MWh (total 62,38)
- Prix électron : HPH 140,48 / HCH 107,12 / HPE 77,40 / HCE 96,08 €/MWh ; abonnement 20 €/mois ; CEE 9,66 €/MWh ; capacité 5,71 €/MWh
- Budget : énergie 6 899, abonnement 240, CEE 603, capacité 356, acheminement 4 090, accise 1 644, CTA 178, TVA 2 802, total 16 812 €

Résultats attendus (hors marge, prix EDF supposé tout compris) : HPE 190,95 → 92,77 €/MWh (≈ 2 354 €/an) ; HCE 113,54 → 111,45 €/MWh (≈ 7 €/an) ; abonnement −150 €/an ; hiver non comparable → alerte « facture d'hiver requise » ; alerte « HCE > HPE » ; alerte « offre expirant sous 48 h ».

## 8. Construction de l'offre client

- Import de la proposition Symphonics : via API (prioritaire) ou PDF (même pipeline d'extraction).
- Application de la marge : par cadran ou globale, en €/MWh, bornée par la **grille de marge** du master (min/max) ; au-delà → validation d'un supérieur.
- Choix de puissance : saisie ou conseillée (afficher l'impact en €/an).
- Génération de l'offre client (PDF à la charte), avec comparatif, conditions, date de validité **≤ validité Symphonics**, blocage automatique à expiration.
- Historique des versions d'offre, duplication, envoi par e-mail avec lien portail client.

## 9. Signature électronique (Yousign API v3)

- Création de la demande : document(s) générés (contrat, conditions, mandat SEPA si activé), signataire(s), champs de signature positionnés, authentification OTP SMS ou e-mail, rappels automatiques, expiration alignée sur la validité de l'offre.
- Parcours client (portail, mobile) : consultation offre → **étapes optionnelles paramétrables par workflow** : dépôt RIB (contrôle IBAN/BIC), pièce d'identité du signataire, Kbis de moins de 3 mois, justificatif de pouvoir → signature.
- Webhooks Yousign (signature vérifiée) : `signature_request.done`, `declined`, `expired`, `signer.done` → mise à jour du workflow.
- Récupération du document signé et du fichier de preuve (audit trail), archivage 10 ans.
- Transmission automatique à Symphonics (API) : contrat signé, données client/site, pièces demandées ; accusé de réception stocké.
- Contrôle back-office avant transmission si le workflow l'exige (pièces illisibles, nom signataire ≠ représentant légal, etc.).

## 10. API partenaire Symphonics

### 10.1 Principes
- API REST documentée OpenAPI 3.1, versionnée (`/api/v1`), environnement sandbox.
- Authentification OAuth2 client credentials, jetons courts, scopes (`offers:write`, `contracts:read`, `contracts:write`, `consumption:write`, `invoices:read`) ; mTLS optionnel ; liste blanche IP.
- Clés d'idempotence sur toutes les écritures, limitation de débit, pagination par curseur, codes d'erreur normalisés.
- Webhooks sortants signés HMAC-SHA256 avec horodatage (anti-rejeu), relances exponentielles, file des échecs rejouable depuis l'admin.
- Journal complet des appels (requête/réponse, sans données sensibles en clair).

### 10.2 Flux
- **Demande de prix** : plateforme → Symphonics (PDL, conso par cadran, puissances, période souhaitée).
- **Proposition de prix** : Symphonics → plateforme (contenu du §6 `supplier_offers`).
- **Transmission du contrat signé** : plateforme → Symphonics.
- **Statut du contrat** : Symphonics → plateforme (accepté, refusé + motif, date de début, résilié, date de fin).
- **Remontée mensuelle de facturation** : Symphonics → plateforme, par contrat : période, MWh par cadran, montant facturé, statut de paiement client.
- **Accès lecture** : Symphonics consulte les dossiers qui lui sont transmis (jamais le reste).
- Si l'API Symphonics n'existe pas encore : prévoir un import CSV/Excel au même format, et un connecteur remplaçable.

## 11. Facturation, commissions et rapprochement

- **Grilles de commission** par master et par niveau : €/MWh consommé, pourcentage, prime à la signature, avec plafond et dates d'effet ; cascade master → sous-régie → équipe → apporteur, chaque parent ne voyant que ce qu'il verse à ses enfants directs.
- **Clôture mensuelle** (tâche planifiée, relançable) :
  1. Réception des remontées Symphonics du mois
  2. Rapprochement contrat par contrat (écarts de volume, contrats manquants, contrats inconnus) → écran d'anomalies à traiter
  3. Calcul des commissions dues par Symphonics par contrat
  4. **Génération des factures vers Symphonics** (une par master ou une consolidée Opérateur, paramétrable), Factur-X, numérotation continue par entité émettrice, détail par contrat en annexe
  5. Génération des relevés de commissions des sous-régies et apporteurs ; **autofacturation** pour les apporteurs qui ont signé un mandat d'autofacturation
  6. Suivi des encaissements (statut payé/partiel/en retard), relances
- Exports comptables (FEC-compatible, CSV) et vue trésorerie prévisionnelle (commissions futures sur la durée des contrats actifs).
- Clawback paramétrable en cas de résiliation anticipée.

## 12. Tableaux de bord

- **Opérateur** : tous les masters, MWh sous gestion, contrats actifs, CA commissions (réel/prévisionnel), anomalies de rapprochement, santé des API.
- **Master / sous-régie** : portefeuille complet de sa branche — contrats ouverts, en cours de signature, actifs, échus ; facturation mensuelle par client ; commissions à recevoir et à verser ; classement équipes/apporteurs.
- **Apporteur** : pipeline, relances à faire, commissions acquises/à venir.
- **Échéancier** : contrats clients (actuels et Symphonics) arrivant à échéance, alertes J-180, J-90, J-30, tâches de renouvellement créées automatiquement.
- Filtres, exports Excel, graphiques de consommation mensuelle par client.

## 13. Notifications et communication

- E-mails transactionnels (domaine authentifié SPF/DKIM/DMARC), SMS, notifications in-app.
- Modèles de messages éditables par master (variables), multilingue prêt (FR par défaut).
- Préférences de notification par utilisateur.

## 14. Administration

- Création master : identité légale, logo/charte, sous-domaine ou domaine personnalisé, workflow, grilles, modèles de documents, premier administrateur invité.
- Gestion des modèles de documents (offre, contrat, mandat SEPA, relevé de commission, facture) avec éditeur et variables.
- Paramètres réglementaires datés : taux d'accise, CTA, TVA, TURPE (versionnés par date d'effet, utilisés par le comparateur).
- Mode maintenance, gestion des clés API, visualisation des files de tâches.

## 15. Livraison et qualité

- Lot 1 : organisations, rôles, authentification, RLS, tests d'isolation.
- Lot 2 : clients/sites, dépôt et extraction de factures, fiche contrat actuel.
- Lot 3 : propositions Symphonics, marge, comparateur, offre PDF.
- Lot 4 : workflows configurables, Yousign, portail client, pièces optionnelles.
- Lot 5 : API Symphonics, webhooks.
- Lot 6 : clôture mensuelle, commissions, factures Factur-X, rapprochement.
- Lot 7 : tableaux de bord, échéancier, exports, durcissement sécurité, pentest.
- Couverture : tests unitaires sur tous les calculs (comparateur, commissions, factures), tests d'intégration API, tests E2E Playwright des parcours principaux, tests d'isolation multi-tenant bloquants.
- Données de démonstration : 2 masters, 3 sous-régies, 10 apporteurs, le cas JOSH du §7.4.
- Documentation : README, guide administrateur, guide apporteur, documentation API publique.

## 16. Points ouverts à me poser avant de coder

1. Nom définitif de l'application (éviter « Symphonics », qui est le nom du fournisseur).
2. Symphonics dispose-t-il déjà d'une API ? Format et documentation.
3. Qui facture Symphonics : chaque master directement ou l'Opérateur de façon consolidée ?
4. Modèle de commission Symphonics (€/MWh, % marge, prime) et durée de versement.
5. Pièce d'identité et RIB : obligatoires pour Symphonics ou optionnels ?
6. Gaz naturel à intégrer dès le départ (PCE, profils, CTA gaz, accise gaz) ?
7. Autres fournisseurs à prévoir plus tard (architecture multi-fournisseurs déjà prête).
