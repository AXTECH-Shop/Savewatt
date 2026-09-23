/**
 * Maps fixed demo fixture prose to stable translation keys. Fixture records keep
 * their original source values so they remain representative of imported data.
 */
export const demoActionKeys = {
  "Faire valider l’offre": "actionValidateOffer",
  "Saisir le tarif fournisseur": "actionEnterSupplierRate",
  "Valider l’extraction": "actionValidateExtraction",
  "Relancer le signataire": "actionFollowUpSigner",
  "Contrôle back-office": "actionBackofficeCheck",
  "Envoyer en signature": "actionSendForSignature",
} as const;

export const demoDueKeys = {
  "Aujourd’hui": "dueToday",
  Demain: "dueTomorrow",
  "18 sept.": "dueSeptember18",
  "19 sept.": "dueSeptember19",
  Terminé: "dueComplete",
  "20 sept.": "dueSeptember20",
} as const;

export const demoRoleKeys = {
  Apporteur: "roleReferrer",
  Apporteuse: "roleReferrerFemale",
} as const;

export const demoPeriodKeys = {
  "Septembre 2026": "periodSeptember2026",
  "Octobre 2026": "periodOctober2026",
  "Août 2026": "periodAugust2026",
} as const;

export const demoAuditActionKeys = {
  "Offre validée": "auditOfferValidated",
  "Marge mise à jour": "auditMarginUpdated",
  "Extraction terminée": "auditExtractionComplete",
  "Signature envoyée": "auditSignatureSent",
} as const;

export const demoAuditDateKeys = {
  "16 sept. 2026 · 10:42": "auditTime1042",
  "16 sept. 2026 · 10:18": "auditTime1018",
  "16 sept. 2026 · 09:56": "auditTime0956",
  "16 sept. 2026 · 09:31": "auditTime0931",
} as const;

export function demoCopyKey<T extends Record<string, string>>(dictionary: T, value: string) {
  return dictionary[value as keyof T];
}
