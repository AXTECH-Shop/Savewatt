import type { Dossier } from "./types";

/**
 * The "JOSH" acceptance case from the brief (§7.4).
 * EDF summer bill (HPE/HCE only) + a Symphonics proposal 07/03/2027–06/03/2029.
 * Expected (hors marge): HPE 190.95 → 92.77 €/MWh (~2 354 €/an);
 * HCE 113.54 → 111.45 €/MWh (~7 €/an); abonnement −150 €/an;
 * alerts: winter bill required, HC>HP, offer expiring.
 */
export function joshDossier(): Dossier {
  const now = Date.now();
  return {
    id: "josh-sample",
    clientName: "JOSH",
    siren: "509847226",
    contactName: "Camille Vasseur",
    contactEmail: "camille.vasseur@josh-demo.fr",
    pdl: "50066947359734",
    segment: "C4",
    files: {
      contract: { name: "contrat-edf-josh.pdf", size: 184320 },
      bill: { name: "facture-edf-2026-09-11.pdf", size: 241664 },
    },
    current: {
      supplier: "EDF",
      offerName: "Tarif Bleu Pro",
      endDate: "2025-03-06", // printed end date, billing continues → reconduction flag
      subscriptionEurMonth: 32.5,
      subscribedPowerKva: 37,
      lines: [
        { cadran: "HPE", unitPriceEurMwh: 190.95, volumeMwh: 3.236 },
        { cadran: "HCE", unitPriceEurMwh: 113.54, volumeMwh: 0.536 },
      ],
    },
    proposal: {
      supplier: "Symphonics",
      ceeEurMwh: 9.66,
      capacityEurMwh: 5.71,
      subscriptionEurMonth: 20,
      marginEurMwh: 0, // start hors marge (matches expected results)
      validUntil: "2026-09-16",
      termYears: 2,
      lines: [
        { cadran: "HPH", electronEurMwh: 140.48, annualVolumeMwh: 29.0 },
        { cadran: "HCH", electronEurMwh: 107.12, annualVolumeMwh: 6.01 },
        { cadran: "HPE", electronEurMwh: 77.4, annualVolumeMwh: 23.98 },
        { cadran: "HCE", electronEurMwh: 96.08, annualVolumeMwh: 3.39 },
      ],
    },
    status: "analyzed",
    createdAt: now,
    updatedAt: now,
  };
}
