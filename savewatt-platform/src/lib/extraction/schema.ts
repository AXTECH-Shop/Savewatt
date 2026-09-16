/**
 * Provider-agnostic extraction schema for French electricity bills.
 *
 * The same facts exist on every FR supplier's bill (EDF, TotalEnergies, Engie,
 * Alpiq, Ekwateur, …) — only the LAYOUT and the printed UNITS change:
 *   - price/kWh:   EDF prints c€/kWh (19.095), TotalEnergies prints €/kWh (0.09707)
 *   - abonnement:  EDF prints €/mois (32.50), TotalEnergies prints €/an (120.00)
 *   - the 14-digit delivery point is labeled PDL (EDF/Total) or PRM (Linky/Engie)
 *   - tariff option: Base (1 band) · HP/HC (2) · 4 bands (HPH/HCH/HPE/HCE) · Tempo · EJP
 *
 * So we capture each fact's RAW printed value + its unit, and ALSO a value
 * NORMALIZED to a canonical unit (€/MWh for energy, €/month for subscription)
 * so everything downstream (comparator, commissions) is supplier-neutral.
 * The AI proposes; a human validates before anything is trusted.
 */

export type Cadran = "HPH" | "HCH" | "HPE" | "HCE" | "HP" | "HC" | "BASE" | "POINTE" | "TEMPO" | "EJP";

/** How a per-kWh price is printed on the bill. */
export type PriceUnit = "c€/kWh" | "€/kWh" | "€/MWh";

/** How the subscription (abonnement) is printed. */
export type SubscriptionUnit = "€/mois" | "€/an";

/** Tariff structure of the current offer. */
export type OptionTarifaire = "BASE" | "HP/HC" | "4_CADRANS" | "TEMPO" | "EJP" | "OTHER";

export interface ConsumptionLine {
  /** Canonical band. Map the supplier's wording (e.g. "Heures Pleines Été") to this. */
  cadran: Cadran;
  volumeKwh: number | null;
  /** Unit price exactly as printed (do not convert). */
  unitPricePrinted: number | null;
  /** Unit of `unitPricePrinted` as printed on the bill. */
  unitPricePrintedUnit: PriceUnit | null;
  /** Same price normalized to €/MWh (c€/kWh ×10, €/kWh ×1000). Feeds the comparator. */
  unitPriceEurMwh: number | null;
  periodStart: string | null; // ISO yyyy-mm-dd
  periodEnd: string | null;
  indexStart: number | null;
  indexEnd: number | null;
}

export interface ServiceLine {
  label: string;
  amountEurHt: number | null;
}

export interface ExtractedBill {
  /** Normalized supplier name: "EDF" | "TotalEnergies" | "Engie" | … */
  supplier: string | null;
  offerName: string | null;
  optionTarifaire: OptionTarifaire | null;

  invoiceNumber: string | null;
  invoiceDate: string | null; // ISO
  nextInvoiceDate: string | null;
  billingAccount: string | null; // Compte de facturation
  commercialAccount: string | null; // Compte commercial
  siren: string | null;
  clientName: string | null; // Titulaire du contrat
  siteAddress: string | null; // Lieu de consommation

  /** 14-digit delivery point, however it is labeled (PDL / PRM). */
  pdlOrPrm: string | null;
  /** Separate meter/compteur id when distinct from the PDL/PRM. */
  meteringId: string | null;
  meterType: string | null; // "PME-PMI", "Compteur Évolué", "Linky", …
  /** C2..C5 if present or derivable (BT<36kVA → C5, BT>36kVA → C4, …), else null. */
  segment: string | null;
  routingTariff: string | null; // "Tarif BT sup 36kVA Courte Utilisation", "BT < 36 kVA", …
  subscribedPowerKva: number | null;
  /** Consommation Annuelle de Référence (CAR) in kWh, when shown. */
  annualReferenceKwh: number | null;

  /** Subscription exactly as printed + its unit, and normalized to €/month. */
  subscriptionPrinted: number | null;
  subscriptionPrintedUnit: SubscriptionUnit | null;
  subscriptionEurPerMonth: number | null;

  contractStartDate: string | null; // souscription
  contractEndDate: string | null; // fin de contrat / échéance
  /** True when the printed end date has passed but billing continues → verify reconduction. */
  tacitRenewalSuspected: boolean | null;

  consumption: ConsumptionLine[];
  services: ServiceLine[];

  totals: {
    totalHtEur: number | null;
    tvaEur: number | null;
    totalTtcEur: number | null;
  };
}

export interface FieldConfidence {
  /** Dot path into `bill`, e.g. "consumption[0].unitPriceEurMwh". */
  path: string;
  /** 0..1 model confidence for that field. */
  confidence: number;
}

export interface ExtractionResult {
  bill: ExtractedBill;
  fieldConfidence: FieldConfidence[];
  /** 0..1 overall confidence across the extraction. */
  overallConfidence: number;
  /** Flags, e.g. "winter bands missing — request a winter bill", "price unit assumed". */
  warnings: string[];
}
