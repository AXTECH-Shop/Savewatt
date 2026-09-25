(() => {
  "use strict";

  const LANGUAGE_STORAGE_KEY = "savewatt-language";
  const SUPPORTED_LOCALES = new Set(["fr", "en"]);
  const sourceText = new WeakMap();
  const sourceAttributes = new WeakMap();
  const sourceHrefs = new WeakMap();
  const sourceJson = new WeakMap();

  // French remains the authored source. English is intentionally explicit so that
  // legal and commercial wording can be reviewed without relying on browser MT.
  const en = {
    "Audit de factures d'énergie et récupération | SaveWatt": "Energy bill audits and recovery | SaveWatt",
    "Audit de factures d'énergie et récupération | SaveWatt V2": "Energy bill audits and recovery | SaveWatt V2",
    "Mentions légales | SaveWatt, une marque d’AX TECH": "Legal notice | SaveWatt, an AX TECH brand",
    "Politique de confidentialité | SaveWatt, une marque d’AX TECH": "Privacy policy | SaveWatt, an AX TECH brand",
    "Gestion des cookies | SaveWatt, une marque d’AX TECH": "Cookie settings | SaveWatt, an AX TECH brand",
    "Plan du site | SaveWatt, une marque d’AX TECH": "Sitemap | SaveWatt, an AX TECH brand",
    "SaveWatt audite vos factures d'électricité et de gaz, récupère les trop-perçus et optimise vos contrats. Audit gratuit, honoraires au résultat.": "SaveWatt audits your electricity and gas bills, recovers overpayments and optimises your contracts. Free audit, success-based fees.",
    "Politique de confidentialité du site SaveWatt opéré par AX TECH : données, finalités, destinataires, conservation et droits.": "Privacy policy for the SaveWatt website operated by AX TECH: data, purposes, recipients, retention and rights.",
    "Informations sur les cookies et le stockage local du site SaveWatt opéré par AX TECH.": "Information about cookies and local storage on the SaveWatt website operated by AX TECH.",
    "Plan du site SaveWatt : parcours entreprises, espace régies, plateforme, contact et informations légales.": "SaveWatt sitemap: business journeys, partner workspace, platform, contact and legal information.",
    "Aller au contenu": "Skip to content",
    "Bureau d'études en optimisation énergétique": "Energy optimisation consultancy",
    "Bureau d'études indépendant en optimisation énergétique.": "Independent energy optimisation consultancy.",
    "Solution": "Solution",
    "Méthode": "Method",
    "Secteurs": "Sectors",
    "Résultats": "Results",
    "FAQ": "FAQ",
    "Thème": "Theme",
    "Audit gratuit": "Free audit",
    "Menu": "Menu",
    "Contact": "Contact",
    "AUDIT · RÉCUPÉRATION · OPTIMISATION": "AUDIT · RECOVERY · OPTIMISATION",
    "Récupérez ce que vos factures d'énergie vous ont coûté en trop.": "Recover what your energy bills have overcharged you.",
    "SaveWatt analyse jusqu'à cinq ans de factures d'électricité et de gaz, détecte les anomalies, récupère les montants indûment facturés et optimise durablement vos contrats. Audit gratuit, sans avance, avec des honoraires uniquement sur les gains effectivement obtenus.": "SaveWatt analyses up to five years of electricity and gas bills, detects anomalies, recovers wrongly charged amounts and sustainably optimises your contracts. A free audit, no upfront payment, with fees only on gains actually obtained.",
    "Demander mon audit gratuit": "Request my free audit",
    "Voir comment ça marche": "See how it works",
    "Bureau d'études indépendant · Paris · France": "Independent consultancy · Paris · France",
    "d'avance": "upfront",
    "analysables": "available for review",
    "indépendant": "independent",
    "0 € d'avance": "€0 upfront",
    "Aucun frais de dossier.": "No application fees.",
    "Jusqu'à 5 ans analysés": "Up to 5 years reviewed",
    "Selon l'historique disponible et les délais de prescription applicables.": "Depending on the available history and applicable limitation periods.",
    "Honoraires au résultat": "Success-based fees",
    "SaveWatt est rémunéré sur les gains effectivement obtenus.": "SaveWatt is paid on gains actually obtained.",
    "Indépendant des fournisseurs": "Independent from suppliers",
    "Notre mission est de défendre vos intérêts.": "Our mission is to represent your interests.",
    "SaveWatt est un bureau d'études indépendant qui analyse les factures d'électricité et de gaz, identifie les surfacturations, accompagne la récupération des montants indus et optimise les contrats énergétiques des collectivités et entreprises.": "SaveWatt is an independent consultancy that analyses electricity and gas bills, identifies overcharges, supports the recovery of undue amounts and optimises the energy contracts of public bodies and businesses.",
    "01 — LE CONSTAT": "01 — THE CHALLENGE",
    "Vos factures peuvent cacher des erreurs coûteuses.": "Your bills can hide costly errors.",
    "Index erronés, puissance mal calibrée, taxes mal appliquées, options tarifaires inadaptées ou contrats jamais renégociés : ces écarts passent souvent inaperçus, faute de temps et d'expertise pour contrôler chaque ligne.": "Incorrect meter readings, poorly calibrated capacity, misapplied taxes, unsuitable tariff options or contracts that have never been renegotiated: these discrepancies often go unnoticed because reviewing every line takes time and expertise.",
    "Erreurs de facturation": "Billing errors",
    "Index incohérents, doublons, abonnements non justifiés ou régularisations contestables peuvent augmenter la facture sans déclencher d'alerte interne.": "Inconsistent meter readings, duplicates, unjustified standing charges or questionable adjustments can increase a bill without triggering an internal alert.",
    "Puissance souscrite inadaptée": "Unsuitable subscribed capacity",
    "Une puissance trop élevée alourdit l'abonnement. Une puissance trop faible peut entraîner des dépassements. Dans les deux cas, le mauvais calibrage coûte.": "Too much subscribed capacity increases standing charges. Too little can lead to excess charges. In both cases, poor calibration costs money.",
    "Taxes et TURPE mal appliqués": "Misapplied taxes and grid charges",
    "Accise, CTA, TURPE, exonérations et taux spécifiques forment un ensemble complexe où une mauvaise application peut durer plusieurs années.": "Excise duty, CTA, TURPE, exemptions and specific rates form a complex framework in which an error can persist for several years.",
    "Contrats devenus obsolètes": "Outdated contracts",
    "Une offre reconduite sans revue, un tarif ancien ou une option mal adaptée peut maintenir durablement un niveau de dépense évitable.": "A renewed offer without review, an old tariff or an unsuitable option can keep avoidable expenditure in place for years.",
    "Jusqu'à cinq années d'historique peuvent être examinées selon la situation. Cet historique permet d'identifier les montants récupérables et les économies futures.": "Up to five years of history may be reviewed depending on the case. It helps identify recoverable amounts and future savings.",
    "Vérifier si mon organisation est concernée": "Check whether my organisation is affected",
    "02 — NOTRE SOLUTION": "02 — OUR SOLUTION",
    "Nous récupérons le passé et optimisons la suite.": "We recover the past and optimise what comes next.",
    "SaveWatt ne vend pas d'énergie. Nous analysons vos dépenses, défendons vos intérêts face aux fournisseurs et gestionnaires de réseau, puis sécurisons les économies obtenues dans la durée.": "SaveWatt does not sell energy. We analyse your costs, represent your interests with suppliers and network operators, then help sustain the savings obtained over time.",
    "Audit complet des factures": "Full bill audit",
    "Analyse ligne par ligne de l'électricité et du gaz : abonnements, consommations, taxes, TURPE, options tarifaires et régularisations.": "Line-by-line analysis of electricity and gas: standing charges, consumption, taxes, grid charges, tariff options and adjustments.",
    "Récupération des trop-perçus": "Overpayment recovery",
    "Constitution des dossiers de réclamation et suivi des échanges jusqu'au remboursement effectif des sommes reconnues comme indues.": "Preparation of claim files and follow-up through to the effective repayment of amounts recognised as undue.",
    "Optimisation de la puissance": "Capacity optimisation",
    "Recalibrage de la puissance souscrite et des options tarifaires à partir de votre consommation réelle afin de réduire les coûts inutiles.": "Recalibration of subscribed capacity and tariff options based on your actual consumption to reduce unnecessary costs.",
    "Renégociation des contrats": "Contract renegotiation",
    "Préparation des renouvellements, comparaison des offres et accompagnement à la décision, y compris dans les contextes de marchés publics.": "Renewal preparation, offer comparison and decision support, including public-procurement contexts.",
    "Valorisation des CEE": "Energy-efficiency certificate support",
    "Identification des travaux éligibles et accompagnement dans la valorisation des Certificats d'Économies d'Énergie lorsque le dispositif est pertinent.": "Identification of eligible works and support in making use of French Energy Savings Certificates where the scheme is relevant.",
    "Veille et suivi continu": "Ongoing monitoring",
    "Contrôle périodique des factures et alerte en cas de dérive afin que les économies ne disparaissent pas au prochain changement de contrat.": "Periodic bill checks and alerts when costs drift, so savings do not disappear with the next contract change.",
    "Découvrir le périmètre de l'audit": "Explore the scope of the audit",
    "03 — LA MÉTHODE": "03 — THE METHOD",
    "Vous transmettez les documents. Nous nous occupons du reste.": "You provide the documents. We take care of the rest.",
    "La démarche est conçue pour mobiliser le moins possible vos équipes. Une facture récente suffit pour démarrer le pré-diagnostic ; l'historique complet peut être rassemblé ensuite.": "The process is designed to take up as little of your team's time as possible. A recent bill is enough to start the initial assessment; the full history can be collected afterwards.",
    "ÉTAPE 1 · VOUS": "STEP 1 · YOU",
    "Transmission des factures et contrats": "Sending bills and contracts",
    "Vous nous communiquez une facture récente, puis les factures et contrats disponibles. Nous vous indiquons précisément les pièces utiles à l'analyse.": "You send us a recent bill, followed by the available bills and contracts. We tell you exactly which documents are needed for the analysis.",
    "ÉTAPE 2 · SAVEWATT": "STEP 2 · SAVEWATT",
    "Audit et diagnostic chiffré": "Audit and quantified assessment",
    "Nous contrôlons les postes de facturation, les taxes, la puissance, les options et les conditions contractuelles, puis nous présentons les anomalies et leviers identifiés.": "We review billing items, taxes, capacity, options and contract terms, then present the anomalies and opportunities identified.",
    "ÉTAPE 3 · SAVEWATT": "STEP 3 · SAVEWATT",
    "Réclamation et récupération": "Claim and recovery",
    "Lorsque des montants indus sont confirmés, nous préparons les réclamations et suivons les échanges avec les acteurs concernés jusqu'à leur résolution.": "When undue amounts are confirmed, we prepare the claims and follow exchanges with the relevant parties through to resolution.",
    "ÉTAPE 4 · ENSEMBLE": "STEP 4 · TOGETHER",
    "Optimisation et suivi durable": "Optimisation and lasting follow-up",
    "Nous ajustons les paramètres et contrats concernés, puis organisons le suivi nécessaire pour préserver les économies dans le temps.": "We adjust the relevant settings and contracts, then arrange the follow-up needed to preserve savings over time.",
    "Notre rémunération est liée aux résultats. Aucun honoraire de récupération n'est dû si aucun gain n'est effectivement obtenu.": "Our fees are tied to results. No recovery fee is due if no gain is actually obtained.",
    "Recevoir mon pré-diagnostic": "Receive my initial assessment",
    "04 — POUR QUI": "04 — WHO IT IS FOR",
    "Pour les organisations dont chaque point de dépense énergétique compte.": "For organisations where every energy cost matters.",
    "SaveWatt intervient lorsque les volumes, le nombre de sites ou la complexité contractuelle justifient une analyse spécialisée.": "SaveWatt helps when volumes, the number of sites or contractual complexity justify specialist analysis.",
    "Collectivités, communes et EPCI": "Public authorities, municipalities and public bodies",
    "Bâtiments publics, écoles, éclairage, équipements sportifs, marchés d'énergie et groupements de commandes.": "Public buildings, schools, lighting, sports facilities, energy procurement and purchasing groups.",
    "Voir la solution pour les collectivités": "See the public-sector solution",
    "Entreprises et parcs multi-sites": "Businesses and multi-site estates",
    "Bureaux, commerces, hôtels, résidences, copropriétés et portefeuilles immobiliers répartis sur plusieurs sites.": "Offices, retail, hotels, residences, co-owned properties and real-estate portfolios across several sites.",
    "Voir la solution multi-sites": "See the multi-site solution",
    "Industrie et logistique": "Industry and logistics",
    "Sites de production, entrepôts, plateformes logistiques et activités où la puissance et les profils de consommation pèsent fortement sur les coûts.": "Production sites, warehouses, logistics platforms and activities where capacity and consumption profiles have a major impact on costs.",
    "Évaluer mon potentiel": "Assess my potential",
    "Votre facture dépasse environ 1 500 € par mois ?": "Does your bill exceed about €1,500 per month?",
    "Le potentiel d'analyse peut déjà justifier un pré-diagnostic.": "The potential may already justify an initial assessment.",
    "Seuil indicatif. La pertinence de l'audit dépend du profil de consommation, des contrats et de l'historique disponible.": "Indicative threshold. Whether an audit is appropriate depends on the consumption profile, contracts and available history.",
    "05 — POURQUOI SAVEWATT": "05 — WHY SAVEWATT",
    "Un intérêt aligné sur le vôtre.": "An interest aligned with yours.",
    "Notre modèle, notre indépendance et notre méthode sont conçus pour une seule finalité : réduire les dépenses injustifiées et rendre les économies mesurables.": "Our model, independence and method are designed for one purpose: reducing unjustified costs and making savings measurable.",
    "Sans risque financier initial": "No initial financial risk",
    "Pas d'avance ni de frais de dossier pour engager l'analyse.": "No upfront payment or application fee to start the analysis.",
    "100 % indépendant": "100% independent",
    "SaveWatt ne vend ni énergie ni contrat fournisseur.": "SaveWatt sells neither energy nor supplier contracts.",
    "Expertise réglementaire": "Regulatory expertise",
    "Analyse des mécanismes de facturation, du TURPE, des taxes, des contrats et des dispositifs applicables.": "Analysis of billing mechanisms, grid charges, taxes, contracts and applicable schemes.",
    "Zéro charge inutile pour vos équipes": "No unnecessary work for your teams",
    "Nous préparons les analyses, dossiers et échanges nécessaires.": "We prepare the analyses, files and necessary exchanges.",
    "Résultats documentés": "Documented results",
    "Les anomalies, remboursements et optimisations sont suivis dans un reporting clair.": "Anomalies, repayments and optimisations are tracked in clear reporting.",
    "Confidentialité des données": "Data confidentiality",
    "Les factures, contrats et informations transmis sont traités dans un cadre défini et sécurisé.": "Submitted bills, contracts and information are handled within a defined, secure framework.",
    "Parler à un expert SaveWatt": "Speak with a SaveWatt expert",
    "06 — EXEMPLES DE POTENTIEL": "06 — EXAMPLES OF POTENTIAL",
    "Des économies qui doivent pouvoir se lire, se vérifier et se suivre.": "Savings that should be readable, verifiable and trackable.",
    "Le potentiel varie selon les volumes, les anomalies, les contrats et l'historique disponible. Les exemples ci-dessous illustrent des profils types et ne constituent pas une garantie de résultat.": "Potential varies according to volumes, anomalies, contracts and available history. The examples below illustrate typical profiles and do not guarantee a result.",
    "Facture, calcul, justificatif et résultat restent traçables.": "The bill, calculation, evidence and result remain traceable.",
    "Profil": "Profile",
    "Facture annuelle": "Annual bill",
    "Montant récupéré": "Amount recovered",
    "Économie": "Saving",
    "Commune d'environ 8 000 habitants": "Municipality of about 8,000 residents",
    "Site industriel": "Industrial site",
    "Groupe hôtelier": "Hotel group",
    "Copropriété tertiaire": "Commercial co-owned property",
    "Exemples illustratifs issus de profils types présentés dans la documentation SaveWatt. Les résultats réels dépendent de l'analyse des factures, contrats et données disponibles. À remplacer par des cas documentés avant toute présentation comme résultats clients.": "Illustrative examples based on typical profiles presented in SaveWatt documentation. Actual results depend on the analysis of available bills, contracts and data. Replace with documented cases before presenting them as client results.",
    "Estimer mon potentiel d'économie": "Estimate my savings potential",
    "07 — QUESTIONS FRÉQUENTES": "07 — FREQUENTLY ASKED QUESTIONS",
    "Ce qu'il faut savoir avant de commencer.": "What you need to know before getting started.",
    "Quels documents faut-il transmettre ?": "Which documents do I need to provide?",
    "Une facture récente suffit pour commencer le pré-diagnostic. Nous vous indiquerons ensuite les factures, contrats et annexes utiles pour approfondir l'analyse.": "A recent bill is enough to start the initial assessment. We will then tell you which bills, contracts and appendices are useful for a deeper analysis.",
    "Faut-il disposer immédiatement de cinq années de factures ?": "Do I need five years of bills immediately?",
    "Non. L'analyse peut démarrer avec les documents disponibles. L'historique complémentaire est rassemblé ensuite lorsque son examen est pertinent.": "No. The analysis can start with the available documents. Additional history is collected later when reviewing it is relevant.",
    "Combien coûte l'audit ?": "How much does the audit cost?",
    "Le pré-diagnostic et l'audit initial sont présentés comme gratuits et sans engagement. Les conditions précises de rémunération au résultat doivent être définies dans la proposition contractuelle.": "The initial assessment and initial audit are presented as free and without commitment. The exact terms of success-based fees must be defined in the contractual proposal.",
    "Que se passe-t-il si aucune économie n'est identifiée ?": "What happens if no saving is identified?",
    "Si aucun gain récupérable ou levier pertinent n'est confirmé, aucun honoraire de récupération au résultat n'est dû selon le modèle présenté.": "If no recoverable gain or relevant opportunity is confirmed, no success-based recovery fee is due under the presented model.",
    "Qui gère les réclamations auprès des fournisseurs ?": "Who manages claims with suppliers?",
    "SaveWatt prépare les dossiers, structure les justificatifs et suit les échanges nécessaires avec les fournisseurs ou gestionnaires concernés.": "SaveWatt prepares the files, structures the evidence and follows the necessary exchanges with the suppliers or operators concerned.",
    "À quelles organisations le service s'adresse-t-il ?": "Which organisations is the service for?",
    "Le service vise principalement les collectivités, entreprises, sites industriels et organisations multi-sites dont les dépenses énergétiques justifient une analyse spécialisée.": "The service is primarily for public authorities, businesses, industrial sites and multi-site organisations whose energy costs justify specialist analysis.",
    "Comment les données de facturation sont-elles protégées ?": "How is billing data protected?",
    "Le formulaire et la proposition contractuelle doivent préciser les finalités du traitement, les destinataires, la durée de conservation et les droits applicables. Une notice de confidentialité doit apparaître directement sous le formulaire.": "The form and contractual proposal must state the purposes of processing, recipients, retention period and applicable rights. A privacy notice must appear directly beneath the form.",
    "Combien de temps faut-il pour recevoir un premier retour ?": "How long does it take to receive an initial response?",
    "Le délai de réponse doit être confirmé par SaveWatt avant publication. Le formulaire affichera ensuite un engagement réaliste, par exemple un premier retour sous quelques jours ouvrés.": "SaveWatt must confirm the response time before publication. The form will then state a realistic commitment, for example an initial response within a few business days.",
    "08 — PRÉ-DIAGNOSTIC EXPRESS": "08 — EXPRESS INITIAL ASSESSMENT",
    "Estimez votre potentiel en 30 secondes.": "Estimate your potential in 30 seconds.",
    "Répondez à quelques questions simples. Vous obtenez immédiatement un score, une fourchette indicative et la liste des pièces à réunir avant un audit complet.": "Answer a few simple questions. You immediately receive a score, an indicative range and a list of documents to collect before a full audit.",
    "Ce que l'outil peut détecter sans API externe.": "What the tool can detect without an external API.",
    "Risque de trop-perçu sur factures passées.": "Risk of overpayment on past bills.",
    "Potentiel d'optimisation contractuelle future.": "Potential for future contract optimisation.",
    "Signal CEE à vérifier si des travaux sont prévus.": "Energy-efficiency certificate signal to check if works are planned.",
    "Pré-diagnostic instantané": "Instant initial assessment",
    "Aucune facture nécessaire pour commencer.": "No bill needed to get started.",
    "Type d'organisation": "Organisation type",
    "Sélectionner": "Select",
    "Collectivité / commune / EPCI": "Public authority / municipality / public body",
    "Entreprise multi-sites": "Multi-site business",
    "Industrie / logistique": "Industry / logistics",
    "Hôtellerie / résidence": "Hospitality / residences",
    "Copropriété / syndic": "Co-owned property / property manager",
    "Tertiaire / bureaux": "Commercial / offices",
    "Autre": "Other",
    "Dépense énergie annuelle estimée": "Estimated annual energy spend",
    "Nombre de sites": "Number of sites",
    "Historique de factures disponible": "Available bill history",
    "12 mois": "12 months",
    "24 mois": "24 months",
    "36 mois": "36 months",
    "48 à 60 mois": "48 to 60 months",
    "Âge du contrat principal": "Age of the main contract",
    "Moins de 12 mois": "Less than 12 months",
    "12 à 24 mois": "12 to 24 months",
    "24 à 36 mois": "24 to 36 months",
    "Plus de 36 mois": "More than 36 months",
    "Signaux observés": "Observed signals",
    "Régularisations ou factures estimées fréquentes": "Frequent adjustments or estimated bills",
    "Puissance souscrite jamais revue": "Subscribed capacity never reviewed",
    "Taxes, TURPE ou lignes réseau difficiles à contrôler": "Taxes, grid charges or network items difficult to review",
    "Écarts visibles entre plusieurs sites": "Visible discrepancies across several sites",
    "Travaux énergie prévus ou récents": "Planned or recent energy works",
    "Calculer mon potentiel": "Calculate my potential",
    "Résultat indicatif, non contractuel. Un audit complet nécessite les factures, contrats, PDL/PRM/PCE et mandat client.": "Indicative, non-contractual result. A full audit requires bills, contracts, PDL/PRM/PCE identifiers and client authorisation.",
    "score d'opportunité": "opportunity score",
    "Potentiel à qualifier": "Potential to assess",
    "Récupération passée": "Past recovery",
    "Économie annuelle future": "Future annual saving",
    "Pièces à réunir pour confirmer": "Documents to collect for confirmation",
    "Recevoir la checklist complète par email": "Receive the full checklist by email",
    "Préparer ma demande": "Prepare my request",
    "08 — PASSEZ À L'ACTION": "08 — TAKE ACTION",
    "Découvrez ce que vous pouvez récupérer.": "Discover what you could recover.",
    "Commencez avec quelques informations et, si vous le souhaitez, une facture récente. SaveWatt vous recontactera pour qualifier le périmètre et organiser le pré-diagnostic, sans engagement.": "Start with a few details and, if you wish, a recent bill. SaveWatt will contact you to qualify the scope and arrange the initial assessment, without commitment.",
    "Une demande courte, sans document obligatoire au départ.": "A short request, with no document required at the start.",
    "Vous décrivez votre organisation et votre niveau de dépense.": "You describe your organisation and level of spending.",
    "Vous joignez une facture récente seulement si elle est déjà disponible.": "You attach a recent bill only if you already have one available.",
    "SaveWatt qualifie le périmètre avant tout engagement.": "SaveWatt qualifies the scope before any commitment.",
    "Nom et prénom": "Full name",
    "Organisation": "Organisation",
    "Fonction": "Job title",
    "E-mail professionnel": "Business email",
    "Téléphone": "Phone",
    "Ville / code postal": "City / postal code",
    "Collectivité / commune": "Public authority / municipality",
    "EPCI / établissement public": "Public body / public establishment",
    "Dépense énergétique mensuelle estimée": "Estimated monthly energy spend",
    "Message": "Message",
    "Ajouter une facture récente (facultatif)": "Add a recent bill (optional)",
    "PDF ou image, 10 Mo maximum.": "PDF or image, 10 MB maximum.",
    "Vous pouvez commencer sans joindre de document. Une facture récente pourra être transmise ensuite.": "You can start without attaching a document. A recent bill can be provided later.",
    "J'accepte que ces informations soient utilisées pour traiter ma demande et me recontacter.": "I agree that this information may be used to process my request and contact me.",
    "Les informations transmises sont utilisées pour traiter votre demande et vous recontacter. Consultez notre": "The information submitted is used to process your request and contact you. See our",
    "politique de confidentialité": "privacy policy",
    "pour connaître vos droits et les modalités de traitement.": "to learn about your rights and how your data is processed.",
    "Récupération, optimisation et suivi durable des dépenses d'électricité et de gaz.": "Recovery, optimisation and lasting monitoring of electricity and gas costs.",
    "Navigation": "Navigation",
    "Légal": "Legal",
    "Mentions légales": "Legal notice",
    "Politique de confidentialité": "Privacy policy",
    "Gestion des cookies": "Cookie settings",
    "Plan du site": "Sitemap",
    "Entreprises": "Businesses",
    "Régies": "Partners",
    "Plateforme": "Platform",
    "Connexion": "Sign in",
    "Nous contacter": "Contact us",
    "LÉGAL": "LEGAL",
    "SaveWatt est une marque commerciale d’AX TECH. AX TECH édite et opère ce site.": "SaveWatt is an AX TECH trading brand. AX TECH publishes and operates this website.",
    "Sommaire": "Contents",
    "Éditeur": "Publisher",
    "Hébergement": "Hosting",
    "Propriété intellectuelle": "Intellectual property",
    "Responsabilité": "Liability",
    "Éditeur et opérateur du site": "Website publisher and operator",
    "Le présent site et l’activité SaveWatt sont édités et opérés par AX TECH — ECOLED WAVE CONCEPT.": "This website and the SaveWatt business are published and operated by AX TECH — ECOLED WAVE CONCEPT.",
    "Forme juridique : SAS": "Legal form: SAS",
    "Siège : 8 rue Marbeau, 75016 Paris, France": "Registered office: 8 rue Marbeau, 75016 Paris, France",
    "E-mail :": "Email:",
    "Directeur de la publication : le représentant légal d’AX TECH": "Publication director: AX TECH's legal representative",
    "SaveWatt désigne la marque commerciale utilisée pour présenter les services d’AX TECH ; elle ne constitue pas une personne morale distincte.": "SaveWatt is the trading brand used to present AX TECH's services; it is not a separate legal entity.",
    "Le site est hébergé par Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis, au moyen du service Cloudflare Pages.": "The website is hosted by Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, United States, through the Cloudflare Pages service.",
    "Les textes, éléments graphiques, illustrations, logos, structures de page et contenus propres au site sont protégés. Toute réutilisation non autorisée est interdite. Les marques et logos de partenaires restent la propriété de leurs titulaires respectifs.": "The website's texts, graphics, illustrations, logos, page structures and original content are protected. Any unauthorised reuse is prohibited. Partners' brands and logos remain the property of their respective owners.",
    "AX TECH s’efforce de maintenir des informations exactes et à jour. Les contenus publics sont informatifs et ne constituent ni une garantie de résultat ni une offre contractuelle. Tout comparatif dépend des données du contrat actuel, du périmètre analysé et de la période de validité de l’offre présentée.": "AX TECH endeavours to keep information accurate and up to date. Public content is informational and constitutes neither a guarantee of results nor a contractual offer. Any comparison depends on current-contract data, the analysed scope and the validity period of the offer presented.",
    "Les anomalies de facturation et possibilités de récupération sont étudiées au cas par cas et ne sont jamais garanties.": "Billing anomalies and recovery opportunities are assessed case by case and are never guaranteed.",
    "Pour toute question relative au site ou à l’activité SaveWatt, écrivez à": "For any question about the website or SaveWatt business, write to",
    "DONNÉES PERSONNELLES": "PERSONAL DATA",
    "AX TECH traite les données liées au site et à l’activité SaveWatt en qualité de responsable du traitement.": "AX TECH processes data relating to the website and the SaveWatt business as controller.",
    "Responsable": "Controller",
    "Données": "Data",
    "Finalités": "Purposes",
    "Destinataires": "Recipients",
    "Conservation": "Retention",
    "Vos droits": "Your rights",
    "Responsable du traitement": "Data controller",
    "AX TECH — ECOLED WAVE CONCEPT, SAS, SIREN 751 982 760, dont le siège est situé 8 rue Marbeau, 75016 Paris, est responsable des traitements réalisés par l’intermédiaire du site et de la marque SaveWatt. Contact :": "AX TECH — ECOLED WAVE CONCEPT, a SAS with SIREN 751 982 760 and registered office at 8 rue Marbeau, 75016 Paris, is controller for processing carried out through the website and the SaveWatt brand. Contact:",
    "Données susceptibles d’être traitées": "Data that may be processed",
    "identité et coordonnées professionnelles : nom, organisation, e-mail et téléphone facultatif ;": "identity and business contact details: name, organisation, email and optional telephone number;",
    "pour une entreprise : nombre de sites, tranche de dépense électrique, fournisseur actuel et échéance du contrat ;": "for a business: number of sites, electricity-spend range, current supplier and contract end date;",
    "pour un partenaire : type d’organisation, taille de l’équipe, territoire et besoin exprimé ;": "for a partner: organisation type, team size, territory and stated need;",
    "données et documents ajoutés ultérieurement dans l’espace authentifié, notamment factures, contrats et identifiants techniques ;": "data and documents later added to the authenticated workspace, including bills, contracts and technical identifiers;",
    "données techniques strictement nécessaires à la sécurité et à la diffusion du site.": "technical data strictly necessary for the security and delivery of the website.",
    "Le formulaire public crée un brouillon dans l’application de messagerie de l’utilisateur. Aucune donnée n’est transmise à AX TECH tant que l’utilisateur n’envoie pas lui-même ce message. Le site public ne permet pas de téléverser une facture ou un contrat.": "The public form creates a draft in the user's email application. No data is sent to AX TECH until the user sends that email themselves. The public website does not allow a bill or contract to be uploaded.",
    "Finalités et bases légales": "Purposes and legal bases",
    "Finalité": "Purpose",
    "Base légale": "Legal basis",
    "Répondre à une demande de comparatif ou de démonstration": "Respond to a comparison or demonstration request",
    "Mesures précontractuelles ou intérêt légitime": "Pre-contractual steps or legitimate interests",
    "Analyser un contrat et préparer une proposition commerciale": "Analyse a contract and prepare a commercial proposal",
    "Mesures précontractuelles ou contrat": "Pre-contractual steps or contract",
    "Créer et administrer les accès à la plateforme": "Create and administer platform access",
    "Contrat ou intérêt légitime": "Contract or legitimate interests",
    "Gérer la relation commerciale, les offres, signatures et commissions": "Manage the business relationship, offers, signatures and commissions",
    "Contrat, intérêt légitime ou obligation légale selon le traitement": "Contract, legitimate interests or legal obligation, depending on the processing",
    "Assurer la sécurité et respecter les obligations administratives": "Ensure security and meet administrative obligations",
    "Intérêt légitime ou obligation légale": "Legitimate interests or legal obligation",
    "Destinataires et sous-traitants": "Recipients and processors",
    "Les données sont accessibles aux personnes habilitées chez AX TECH et aux prestataires techniques nécessaires à la messagerie, à l’hébergement et à l’exploitation sécurisée de la plateforme.": "Data is accessible to authorised AX TECH personnel and technical providers needed for messaging, hosting and secure platform operation.",
    "Les informations nécessaires à une offre ou à un contrat peuvent être transmises à Symphonics dans le cadre de la demande du client, ainsi qu’aux organismes ou gestionnaires concernés lorsqu’une obligation, une autorisation ou un mandat le permet. Elles ne sont pas rendues publiques.": "Information needed for an offer or contract may be shared with Symphonics as part of the client's request, and with the relevant organisations or operators when an obligation, authorisation or mandate permits it. It is not made public.",
    "Durées de conservation": "Retention periods",
    "Prospects sans suite : jusqu’à 3 ans après le dernier contact.": "Prospects with no further action: up to 3 years after the last contact.",
    "Données client et partenaire : pendant la relation contractuelle, puis pendant les délais de prescription applicables.": "Client and partner data: for the duration of the contractual relationship, then for applicable limitation periods.",
    "Documents contractuels et comptables : selon les durées légales applicables en France.": "Contractual and accounting documents: according to the legal retention periods applicable in France.",
    "Préférence de thème : jusqu’à sa suppression depuis le navigateur.": "Theme preference: until deleted in the browser.",
    "Vous pouvez demander l’accès, la rectification, l’effacement, la limitation, l’opposition ou la portabilité de vos données lorsque ces droits s’appliquent, en écrivant à": "You may request access, rectification, erasure, restriction, objection or portability of your data where these rights apply, by writing to",
    "Vous pouvez également introduire une réclamation auprès de la": "You may also lodge a complaint with the",
    "COOKIES": "COOKIES",
    "Le site public SaveWatt n’utilise actuellement aucun traceur publicitaire ou outil de mesure d’audience non essentiel.": "The public SaveWatt website currently uses no advertising tracker or non-essential audience-measurement tool.",
    "Définition": "Definition",
    "Utilisation actuelle": "Current use",
    "Évolution": "Future changes",
    "Paramétrer": "Settings",
    "Qu’est-ce qu’un cookie ?": "What is a cookie?",
    "Un cookie est un petit fichier ou identifiant enregistré par le navigateur. Des technologies proches, comme le stockage local, peuvent conserver une préférence technique sans suivre la navigation à des fins commerciales.": "A cookie is a small file or identifier stored by the browser. Similar technologies, such as local storage, can retain a technical preference without tracking browsing for commercial purposes.",
    "AX TECH n’active sur ce site public ni publicité ciblée, ni retargeting, ni mesure d’audience non essentielle. Un seul réglage local peut être conservé :": "AX TECH enables neither targeted advertising, retargeting nor non-essential audience measurement on this public website. Only one local setting may be stored:",
    "Nom": "Name",
    "Type": "Type",
    "Durée": "Duration",
    "Stockage local": "Local storage",
    "Mémoriser le thème clair ou sombre choisi": "Remember the selected light or dark theme",
    "Jusqu’à suppression par l’utilisateur": "Until deleted by the user",
    "Ce réglage est fonctionnel et ne sert pas à identifier l’utilisateur entre différents sites.": "This setting is functional and is not used to identify the user across different sites.",
    "Évolution des outils": "Changes to tools",
    "Si AX TECH ajoute ultérieurement un outil nécessitant le consentement, il restera désactivé avant l’expression d’un choix et cette page sera mise à jour. Un mécanisme de choix sera alors présenté avec une possibilité équivalente d’accepter ou de refuser.": "If AX TECH later adds a tool that requires consent, it will remain disabled until a choice is made and this page will be updated. A choice mechanism will then be presented with equivalent options to accept or refuse.",
    "Supprimer la préférence": "Delete the preference",
    "Vous pouvez supprimer la préférence de thème depuis les paramètres de votre navigateur en effaçant les données du site savewatt.fr. Le site utilisera ensuite la préférence d’affichage du système.": "You can delete the theme preference in your browser settings by clearing data for savewatt.fr. The website will then use the system display preference.",
    "PLAN DU SITE": "SITEMAP",
    "Retrouvez les deux parcours SaveWatt et les informations publiées par AX TECH.": "Find the two SaveWatt journeys and information published by AX TECH.",
    "Site": "Website",
    "Fichiers techniques": "Technical files",
    "Parcours principaux": "Main journeys",
    "Accueil SaveWatt": "SaveWatt home",
    "Comparatif pour les entreprises": "Business comparison",
    "Recevoir un comparatif gratuit": "Receive a free comparison",
    "Parcours pour les régies et apporteurs": "Journey for partners and introducers",
    "Fonctionnalités de la plateforme": "Platform features",
    "Notre fournisseur partenaire": "Our supplier partner",
    "Questions fréquentes": "Frequently asked questions",
    "Demande de comparatif": "Comparison request",
    "Demande de démonstration partenaire": "Partner demonstration request",
    "Connexion à la plateforme": "Sign in to the platform",
    "Pages légales": "Legal pages",
    "Contexte pour assistants IA": "Context for AI assistants",
    "Analyse, comparaison et plateforme commerciale pour l’électricité des professionnels.": "Analysis, comparison and commercial platform for business electricity.",
    "© 2026 AX TECH. SaveWatt est une marque d’AX TECH.": "© 2026 AX TECH. SaveWatt is an AX TECH brand.",
    "Clair": "Light",
    "Sombre": "Dark",
    "Activer le thème clair": "Use light theme",
    "Activer le thème sombre": "Use dark theme",
    "Changer le thème": "Change theme",
    "Preuves de réassurance": "Trust indicators",
    "Engagements SaveWatt": "SaveWatt commitments",
    "Navigation principale": "Main navigation",
    "Navigation mobile": "Mobile navigation",
    "Navigation pied de page": "Footer navigation",
    "Liens légaux": "Legal links",
    "Fonctionnement de l'estimateur SaveWatt": "How the SaveWatt estimator works",
    "Réassurance avant demande d'audit": "Information before requesting an audit",
    "Exemples illustratifs de potentiel d'économie": "Illustrative examples of savings potential",
    "SaveWatt accueil": "SaveWatt home",
    "SaveWatt, accueil": "SaveWatt home",
    "Infographie SaveWatt : facture reçue, anomalie identifiée, réclamation traitée et montant récupéré.": "SaveWatt infographic: bill received, anomaly identified, claim handled and amount recovered.",
    "Quatre exemples illustrés : erreur de facturation, puissance inadaptée, taxes incorrectes et contrat obsolète.": "Four illustrated examples: billing error, unsuitable capacity, incorrect taxes and outdated contract.",
    "Audit d'une facture avec une anomalie détectée.": "Audit of a bill with a detected anomaly.",
    "Montant retourné par le fournisseur vers le client.": "Amount returned by the supplier to the client.",
    "Comparaison entre puissance souscrite et puissance réellement utilisée.": "Comparison between subscribed and actually used capacity.",
    "Comparaison d'un contrat actuel avec un contrat optimisé.": "Comparison between a current and optimised contract.",
    "Amélioration énergétique donnant lieu à un certificat CEE validé.": "Energy improvement leading to a validated energy-efficiency certificate.",
    "Contrôle continu des factures sur plusieurs mois.": "Continuous monitoring of bills over several months.",
    "Méthode SaveWatt en quatre étapes : transmission, audit, récupération et optimisation.": "The four-step SaveWatt method: submission, audit, recovery and optimisation.",
    "Bâtiments publics reliés à une analyse énergétique consolidée.": "Public buildings connected to consolidated energy analysis.",
    "Plusieurs sites d'entreprise reliés à une analyse énergétique unique.": "Several business sites connected to a single energy analysis.",
    "Site industriel et logistique avec puissance et contrat optimisés.": "Industrial and logistics site with optimised capacity and contract.",
    "Traçabilité SaveWatt : anomalie confirmée, calcul vérifié et montant récupéré.": "SaveWatt traceability: anomaly confirmed, calculation verified and amount recovered.",
    "Résultat vérifié de la facture au gain documenté.": "Verified result from the bill to the documented gain.",
    "Envoi sécurisé d'une facture récente vers l'analyse SaveWatt.": "Secure submission of a recent bill for SaveWatt analysis.",
    "Ex. 1 500 €": "e.g. €1,500"
  };

  const normalize = (value) => value.replace(/\s+/g, " ").trim();
  const translate = (value, locale) => locale === "en" ? en[normalize(value)] || value : value;

  function renderText(locale) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return normalize(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!sourceText.has(node)) sourceText.set(node, node.nodeValue || "");
      const source = node.parentElement?.dataset.i18nSource || sourceText.get(node) || "";
      const leading = source.match(/^\s*/)?.[0] || "";
      const trailing = source.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${translate(source, locale)}${trailing}`;
    });
  }

  function renderAttributes(locale) {
    const attributes = ["alt", "aria-label", "placeholder", "title", "data-label"];
    document.querySelectorAll("*").forEach((element) => {
      if (!sourceAttributes.has(element)) {
        sourceAttributes.set(element, Object.fromEntries(attributes.filter((attribute) => element.hasAttribute(attribute)).map((attribute) => [attribute, element.getAttribute(attribute)])));
      }
      const source = sourceAttributes.get(element);
      Object.entries(source).forEach(([attribute, value]) => element.setAttribute(attribute, translate(value || "", locale)));
    });
  }

  function renderMetadata(locale) {
    if (!sourceText.has(document.head)) sourceText.set(document.head, document.title);
    document.title = translate(sourceText.get(document.head) || document.title, locale);
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach((meta) => {
      if (!sourceAttributes.has(meta)) sourceAttributes.set(meta, { content: meta.content });
      meta.content = translate(sourceAttributes.get(meta).content || "", locale);
    });
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", locale === "en" ? "en_US" : "fr_FR");
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      if (!sourceJson.has(script)) sourceJson.set(script, script.textContent || "");
      if (locale === "fr") {
        script.textContent = sourceJson.get(script);
        return;
      }
      try {
        const data = JSON.parse(sourceJson.get(script));
        const localize = (value) => Array.isArray(value) ? value.map(localize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item)])) : typeof value === "string" ? translate(value, locale) : value;
        script.textContent = JSON.stringify(localize(data));
      } catch { /* Invalid structured data stays untouched. */ }
    });
  }

  function updateInternalLinks(locale) {
    document.querySelectorAll("a[href]").forEach((link) => {
      if (!sourceHrefs.has(link)) sourceHrefs.set(link, link.getAttribute("href") || "");
      const source = sourceHrefs.get(link) || "";
      if (/^(mailto:|tel:|https?:\/\/)/i.test(source)) return;
      const url = new URL(source, window.location.origin + window.location.pathname);
      if (locale === "en") url.searchParams.set("lang", "en");
      else url.searchParams.delete("lang");
      const isHash = source.startsWith("#");
      link.setAttribute("href", isHash ? `${url.search}${url.hash}` : `${url.pathname}${url.search}${url.hash}`);
    });
  }

  function updateCanonical(locale) {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) return;
    if (!sourceHrefs.has(canonical)) sourceHrefs.set(canonical, canonical.getAttribute("href") || "");
    const url = new URL(sourceHrefs.get(canonical), window.location.origin);
    if (locale === "en") url.searchParams.set("lang", "en");
    canonical.setAttribute("href", url.toString());
  }

  function createLanguageSwitcher(locale) {
    let switcher = document.querySelector("[data-language-switcher]");
    if (!switcher) {
      switcher = document.createElement("div");
      switcher.className = "language-switcher";
      switcher.dataset.languageSwitcher = "";
      switcher.innerHTML = '<button type="button" data-language="fr">FR</button><button type="button" data-language="en">EN</button>';
      document.querySelector(".header-actions")?.prepend(switcher);
      switcher.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-language]");
        if (button) setLocale(button.dataset.language, true);
      });
    }
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", locale === "en" ? "Language" : "Langue");
    switcher.querySelectorAll("button[data-language]").forEach((button) => {
      const active = button.dataset.language === locale;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", button.dataset.language === "fr" ? (locale === "en" ? "French" : "Français") : "English");
    });
  }

  function setLocale(nextLocale, pushState) {
    const locale = SUPPORTED_LOCALES.has(nextLocale) ? nextLocale : "fr";
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    renderText(locale);
    renderAttributes(locale);
    renderMetadata(locale);
    updateInternalLinks(locale);
    updateCanonical(locale);
    createLanguageSwitcher(locale);
    if (pushState) {
      const url = new URL(window.location.href);
      if (locale === "en") url.searchParams.set("lang", "en");
      else url.searchParams.delete("lang");
      window.history.pushState({ locale }, "", url);
    }
    document.dispatchEvent(new CustomEvent("savewatt:localechange", { detail: { locale } }));
  }

  const requested = new URLSearchParams(window.location.search).get("lang");
  const initialLocale = SUPPORTED_LOCALES.has(requested) ? requested : localStorage.getItem(LANGUAGE_STORAGE_KEY) || "fr";
  window.SaveWattI18n = { get locale() { return document.documentElement.lang; }, setLocale, translate: (value) => translate(value, document.documentElement.lang), setText: (element, value) => { if (element) { element.dataset.i18nSource = value; element.textContent = translate(value, document.documentElement.lang); } } };
  setLocale(initialLocale, false);
})();
