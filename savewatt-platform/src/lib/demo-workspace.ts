import type { DossierStatus } from "./types";

export interface DemoDeal {
  id: string;
  client: string;
  owner: string;
  ownerId: string;
  orgPath: string;
  pdl: string;
  segment: string;
  status: DossierStatus;
  annualConsumptionMwh: number;
  annualSavingEur: number;
  nextAction: string;
  dueLabel: string;
}

export interface DemoOrganization {
  id: string;
  name: string;
  type: "OPERATOR" | "MASTER" | "SUB_REGIE" | "TEAM";
  path: string;
  parentId: string | null;
  activeMembers: number;
  openDeals: number;
  monthlyMwh: number;
}

export interface DemoCommissionLine {
  id: string;
  contract: string;
  beneficiary: string;
  period: string;
  volumeMwh: number;
  basisEurMwh: number;
  amountEur: number;
  status: "forecast" | "vesting" | "available" | "paid" | "clawback";
}

export const demoOrganizations: DemoOrganization[] = [
  { id: "axtech", name: "AX TECH", type: "OPERATOR", path: "axtech", parentId: null, activeMembers: 8, openDeals: 38, monthlyMwh: 1842 },
  { id: "idf", name: "Régie Île-de-France", type: "MASTER", path: "axtech.ile_de_france", parentId: "axtech", activeMembers: 19, openDeals: 17, monthlyMwh: 836 },
  { id: "grand-est", name: "Énergie Grand Est", type: "MASTER", path: "axtech.grand_est", parentId: "axtech", activeMembers: 11, openDeals: 12, monthlyMwh: 614 },
  { id: "rhones", name: "Collectif Rhône Pro", type: "MASTER", path: "axtech.rhone", parentId: "axtech", activeMembers: 9, openDeals: 9, monthlyMwh: 392 },
  { id: "seine-ouest", name: "Seine Ouest", type: "SUB_REGIE", path: "axtech.ile_de_france.seine_ouest", parentId: "idf", activeMembers: 8, openDeals: 8, monthlyMwh: 412 },
  { id: "paris-ouest", name: "Équipe Paris Ouest", type: "TEAM", path: "axtech.ile_de_france.seine_ouest.paris_ouest", parentId: "seine-ouest", activeMembers: 5, openDeals: 6, monthlyMwh: 286 },
  { id: "versailles", name: "Équipe Versailles", type: "TEAM", path: "axtech.ile_de_france.seine_ouest.versailles", parentId: "seine-ouest", activeMembers: 3, openDeals: 2, monthlyMwh: 126 },
];

export const demoDeals: DemoDeal[] = [
  { id: "josh-sample", client: "JOSH Rue du Poteau", owner: "Nicolas Bernard", ownerId: "demo-apporteur", orgPath: "axtech.ile_de_france.paris_ouest.demo-apporteur", pdl: "50066947359734", segment: "C4", status: "proposalReady", annualConsumptionMwh: 62.38, annualSavingEur: 2511, nextAction: "Faire valider l’offre", dueLabel: "Aujourd’hui" },
  { id: "atelier-vaugirard", client: "Atelier Vaugirard", owner: "Nicolas Bernard", ownerId: "demo-apporteur", orgPath: "axtech.ile_de_france.paris_ouest.demo-apporteur", pdl: "50092118403427", segment: "C4", status: "analyzed", annualConsumptionMwh: 91.46, annualSavingEur: 3184, nextAction: "Saisir le tarif fournisseur", dueLabel: "Demain" },
  { id: "boulangerie-lamarck", client: "Boulangerie Lamarck", owner: "Inès Lemaire", ownerId: "ines-lemaire", orgPath: "axtech.ile_de_france.paris_ouest.ines-lemaire", pdl: "50038417622904", segment: "C5", status: "uploaded", annualConsumptionMwh: 28.74, annualSavingEur: 0, nextAction: "Valider l’extraction", dueLabel: "18 sept." },
  { id: "hotel-opera", client: "Hôtel Opéra Lafayette", owner: "Karim Benali", ownerId: "karim-benali", orgPath: "axtech.ile_de_france.paris_ouest.karim-benali", pdl: "50074296183015", segment: "C4", status: "sent", annualConsumptionMwh: 178.62, annualSavingEur: 7426, nextAction: "Relancer le signataire", dueLabel: "19 sept." },
  { id: "medicentre", client: "Médicentre Boulogne", owner: "Solène Caron", ownerId: "solene-caron", orgPath: "axtech.ile_de_france.seine_ouest.solene-caron", pdl: "50019843766201", segment: "C3", status: "signed", annualConsumptionMwh: 243.18, annualSavingEur: 9684, nextAction: "Contrôle back-office", dueLabel: "Terminé" },
  { id: "logis-rive", client: "Logis Rive Gauche", owner: "Inès Lemaire", ownerId: "ines-lemaire", orgPath: "axtech.ile_de_france.paris_ouest.ines-lemaire", pdl: "50061582309142", segment: "C4", status: "proposalReady", annualConsumptionMwh: 112.8, annualSavingEur: 4017, nextAction: "Envoyer en signature", dueLabel: "20 sept." },
];

export const demoCommissionLines: DemoCommissionLine[] = [
  { id: "cl-1", contract: "Médicentre Boulogne", beneficiary: "Nicolas Bernard", period: "Septembre 2026", volumeMwh: 20.27, basisEurMwh: 18.4, amountEur: 123.08, status: "available" },
  { id: "cl-2", contract: "Hôtel Opéra Lafayette", beneficiary: "Nicolas Bernard", period: "Septembre 2026", volumeMwh: 14.89, basisEurMwh: 16.8, amountEur: 82.54, status: "vesting" },
  { id: "cl-3", contract: "JOSH Rue du Poteau", beneficiary: "Nicolas Bernard", period: "Octobre 2026", volumeMwh: 5.2, basisEurMwh: 15.37, amountEur: 26.36, status: "forecast" },
  { id: "cl-4", contract: "Brasserie Saint-Louis", beneficiary: "Équipe Paris Ouest", period: "Août 2026", volumeMwh: 31.42, basisEurMwh: 17.2, amountEur: 178.32, status: "paid" },
];

export const teamMembers = [
  { name: "Nicolas Bernard", role: "Apporteur", deals: 8, signed: 4, conversion: 44.4, commissionEur: 232.18 },
  { name: "Inès Lemaire", role: "Apporteuse", deals: 7, signed: 3, conversion: 37.5, commissionEur: 186.42 },
  { name: "Karim Benali", role: "Apporteur", deals: 6, signed: 3, conversion: 42.9, commissionEur: 174.86 },
  { name: "Solène Caron", role: "Apporteuse", deals: 5, signed: 2, conversion: 33.3, commissionEur: 129.64 },
];

export const auditEvents = [
  { at: "16 sept. 2026 · 10:42", actor: "Claire Martin", action: "Offre validée", target: "JOSH Rue du Poteau", trace: "evt_7f3a9c" },
  { at: "16 sept. 2026 · 10:18", actor: "Nicolas Bernard", action: "Marge mise à jour", target: "Atelier Vaugirard", trace: "evt_5c8d21" },
  { at: "16 sept. 2026 · 09:56", actor: "Système", action: "Extraction terminée", target: "Boulangerie Lamarck", trace: "evt_2d914e" },
  { at: "16 sept. 2026 · 09:31", actor: "Karim Benali", action: "Signature envoyée", target: "Hôtel Opéra Lafayette", trace: "evt_1a6b72" },
];
