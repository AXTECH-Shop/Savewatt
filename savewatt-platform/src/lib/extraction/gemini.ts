import "server-only";
import type { ExtractionResult } from "./schema";
import { normalizeResult } from "./normalize";
import { getGoogleAccessToken } from "./google-auth";

/**
 * Gemini-based, provider-agnostic bill extraction through Vertex AI (EU data
 * residency by default), billed to the GCP project credits.
 */
const Type = {
  OBJECT: "OBJECT",
  ARRAY: "ARRAY",
  STRING: "STRING",
  NUMBER: "NUMBER",
  BOOLEAN: "BOOLEAN",
} as const;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function vertexEndpoint(): string {
  const project = process.env.VERTEX_PROJECT_ID;
  if (!project) throw new Error("VERTEX_PROJECT_ID is not set.");
  const location = process.env.VERTEX_LOCATION || "eu";
  const host =
    location === "global"
      ? "aiplatform.googleapis.com"
      : location === "eu" || location === "us"
        ? `aiplatform.${location}.rep.googleapis.com`
        : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${GEMINI_MODEL}:generateContent`;
}

const SYSTEM_INSTRUCTION = `Tu es un expert de l'analyse de factures d'électricité professionnelles françaises, TOUS FOURNISSEURS confondus (EDF, TotalEnergies, Engie, Alpiq, Ekwateur, Vattenfall, Octopus, etc.).

PRINCIPE CLÉ: les mêmes informations existent sur toutes les factures — seuls la MISE EN PAGE et les UNITÉS changent. Cherche chaque information où qu'elle soit, quel que soit le fournisseur. N'invente jamais une valeur; si absente ou illisible, mets null.

Synonymes à mapper vers un modèle canonique:
- Point de livraison 14 chiffres: "PDL", "PRM", "Point de Référence de Mesure" → pdlOrPrm. Le "N° de compteur"/"Identifiant de comptage" distinct → meteringId.
- Titulaire: "Titulaire du contrat", "Nom du client" → clientName. Site: "Lieu de consommation", "Adresse du site" → siteAddress.
- Cadrans: "Base" → BASE; "Heures Pleines/Creuses" → HP/HC; "Heures Pleines/Creuses Été/Hiver" → HPE/HCE/HPH/HCH; "Tempo" → TEMPO; "EJP" → EJP; "Pointe" → POINTE.
- Option tarifaire → optionTarifaire: BASE | HP/HC | 4_CADRANS | TEMPO | EJP | OTHER.
- Puissance souscrite (kVA ou kW) → subscribedPowerKva. Segment "C2..C5"; sinon déduis du raccordement ("BT < 36 kVA" ≈ C5, "BT > 36 kVA" ≈ C4).
- Taxes (neutralisées dans la comparaison, mais à extraire): Acheminement/Transport, Accise/TICFE/CSPE, CTA, TVA.
- CAR "Consommation Annuelle de Référence" → annualReferenceKwh.

FOURNITURE vs RÉSEAU — règle critique pour "consumption":
- consumption = UNIQUEMENT les lignes de prix de l'énergie facturées par le fournisseur (rubrique "Fourniture", "Électricité", "Energie active", "Consommation").
- N'y mets JAMAIS les lignes d'acheminement/réseau (rubrique "Acheminement", "Transport et acheminement", "Composante de soutirage", "Heures pleines/creuses saison basse/haute" facturées sous l'acheminement — ex 0,0166 €/kWh), ni les taxes (accise, CSPE, CTA, TVA). Ces lignes réseau utilisent souvent des cadrans saisonniers même quand l'énergie est en Base: l'option de fourniture (optionTarifaire) est celle des lignes d'énergie.
- supplyCharges = autres montants PAR kWh facturés par le fournisseur en plus du prix de l'énergie: "Obligations"/CEE, "Mécanisme de capacité", "Garanties d'origine". Pour chacun: label, prix imprimé + unité, et prix normalisé en €/MWh. Ne mets pas l'abonnement ni les taxes.
- consumptionDiscountPct = pourcentage d'une remise/promotion appliquée sur la consommation d'énergie (ex "Promotion de 15,00 % sur la consommation" → 15), sinon null.

UNITÉS — capture la valeur BRUTE + son unité imprimée, ET la valeur NORMALISÉE:
- Prix d'énergie: unitPricePrinted = valeur exacte imprimée; unitPricePrintedUnit = "c€/kWh" (ex EDF 19,095) ou "€/kWh" (ex TotalEnergies 0,09707) ou "€/MWh"; unitPriceEurMwh = normalisé en €/MWh (c€/kWh×10, €/kWh×1000).
- Abonnement: subscriptionPrinted + subscriptionPrintedUnit ("€/mois" ex EDF 32,50, ou "€/an" ex Total 120,00); subscriptionEurPerMonth = normalisé en €/mois (€/an ÷ 12).

Autres règles:
- Dates au format ISO yyyy-mm-dd. Si l'échéance imprimée est dépassée alors que la facturation continue → tacitRenewalSuspected=true.
- fieldConfidence: confiance 0..1 par champ renseigné; overallConfidence global.
- warnings: signale l'absence de cadrans d'hiver quand seuls des cadrans d'été sont facturés ("facture d'hiver requise"), une unité de prix supposée, ou toute incohérence (ex: HC > HP).`;

const PROMPT = `Analyse cette facture d'électricité (n'importe quel fournisseur français) et renvoie STRICTEMENT le JSON conforme au schéma. Trouve, où qu'elles soient: fournisseur, offre et option tarifaire, numéro et date de facture, comptes, SIREN, titulaire, adresse du site, PDL/PRM (14 chiffres), identifiant de comptage, type de compteur, segment/raccordement, puissance souscrite, CAR, abonnement (valeur + unité + normalisé €/mois), dates de contrat, consommation d'énergie par cadran (volume kWh, prix imprimé + unité + normalisé €/MWh, période, index — jamais les lignes d'acheminement), charges fournisseur par kWh (obligations/CEE, capacité, garanties d'origine), remise en % sur la consommation, services, et totaux HT/TVA/TTC.`;

const consumptionItem = {
  type: Type.OBJECT,
  properties: {
    cadran: {
      type: Type.STRING,
      enum: ["HPH", "HCH", "HPE", "HCE", "HP", "HC", "BASE", "POINTE", "TEMPO", "EJP"],
    },
    volumeKwh: { type: Type.NUMBER, nullable: true },
    unitPricePrinted: { type: Type.NUMBER, nullable: true },
    unitPricePrintedUnit: {
      type: Type.STRING,
      enum: ["c€/kWh", "€/kWh", "€/MWh"],
      nullable: true,
    },
    unitPriceEurMwh: { type: Type.NUMBER, nullable: true },
    periodStart: { type: Type.STRING, nullable: true },
    periodEnd: { type: Type.STRING, nullable: true },
    indexStart: { type: Type.NUMBER, nullable: true },
    indexEnd: { type: Type.NUMBER, nullable: true },
  },
  required: ["cadran"],
};

const serviceItem = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    amountEurHt: { type: Type.NUMBER, nullable: true },
  },
  required: ["label"],
};

const supplyChargeItem = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    unitPricePrinted: { type: Type.NUMBER, nullable: true },
    unitPricePrintedUnit: { type: Type.STRING, enum: ["c€/kWh", "€/kWh", "€/MWh"], nullable: true },
    unitPriceEurMwh: { type: Type.NUMBER, nullable: true },
  },
  required: ["label"],
};

const billSchema = {
  type: Type.OBJECT,
  properties: {
    supplier: { type: Type.STRING, nullable: true },
    offerName: { type: Type.STRING, nullable: true },
    optionTarifaire: {
      type: Type.STRING,
      enum: ["BASE", "HP/HC", "4_CADRANS", "TEMPO", "EJP", "OTHER"],
      nullable: true,
    },
    invoiceNumber: { type: Type.STRING, nullable: true },
    invoiceDate: { type: Type.STRING, nullable: true },
    nextInvoiceDate: { type: Type.STRING, nullable: true },
    billingAccount: { type: Type.STRING, nullable: true },
    commercialAccount: { type: Type.STRING, nullable: true },
    siren: { type: Type.STRING, nullable: true },
    clientName: { type: Type.STRING, nullable: true },
    siteAddress: { type: Type.STRING, nullable: true },
    pdlOrPrm: { type: Type.STRING, nullable: true },
    meteringId: { type: Type.STRING, nullable: true },
    meterType: { type: Type.STRING, nullable: true },
    segment: { type: Type.STRING, nullable: true },
    routingTariff: { type: Type.STRING, nullable: true },
    subscribedPowerKva: { type: Type.NUMBER, nullable: true },
    annualReferenceKwh: { type: Type.NUMBER, nullable: true },
    subscriptionPrinted: { type: Type.NUMBER, nullable: true },
    subscriptionPrintedUnit: {
      type: Type.STRING,
      enum: ["€/mois", "€/an"],
      nullable: true,
    },
    subscriptionEurPerMonth: { type: Type.NUMBER, nullable: true },
    contractStartDate: { type: Type.STRING, nullable: true },
    contractEndDate: { type: Type.STRING, nullable: true },
    tacitRenewalSuspected: { type: Type.BOOLEAN, nullable: true },
    consumption: { type: Type.ARRAY, items: consumptionItem },
    supplyCharges: { type: Type.ARRAY, items: supplyChargeItem },
    consumptionDiscountPct: { type: Type.NUMBER, nullable: true },
    services: { type: Type.ARRAY, items: serviceItem },
    totals: {
      type: Type.OBJECT,
      properties: {
        totalHtEur: { type: Type.NUMBER, nullable: true },
        tvaEur: { type: Type.NUMBER, nullable: true },
        totalTtcEur: { type: Type.NUMBER, nullable: true },
      },
    },
  },
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bill: billSchema,
    fieldConfidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["path", "confidence"],
      },
    },
    overallConfidence: { type: Type.NUMBER },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["bill", "overallConfidence"],
};

export interface BillInput {
  /** Base64-encoded file bytes. */
  data: string;
  /** e.g. "application/pdf", "image/png". */
  mimeType: string;
}

/** Extract a structured current-contract from any French electricity bill (PDF or image). */
export async function extractBill(input: BillInput): Promise<ExtractionResult> {
  const response = await fetch(vertexEndpoint(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${await getGoogleAccessToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: input.data, mimeType: input.mimeType } },
            { text: PROMPT },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(`Vertex AI ${response.status}: ${body.error?.message ?? "erreur inconnue"}`);
  }

  const text = body.candidates?.[0]?.content?.parts
    ?.filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("");
  if (!text) throw new Error("Réponse vide du modèle d'extraction.");
  return normalizeResult(JSON.parse(text) as ExtractionResult);
}
