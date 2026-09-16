export type Cadran = "HPH" | "HCH" | "HPE" | "HCE" | "HP" | "HC" | "BASE";
export type Segment = "C2" | "C3" | "C4" | "C5";

export type DossierStatus =
  | "draft"
  | "uploaded"
  | "analyzed"
  | "proposalReady"
  | "sent"
  | "signed"
  | "lost";

export interface UploadedFile {
  name: string;
  size: number;
}

/** A price line read from the client's current bill. */
export interface CurrentLine {
  cadran: Cadran;
  unitPriceEurMwh: number; // current unit price
  volumeMwh: number; // volume seen on the bill (may be a single season)
}

export interface CurrentContract {
  supplier: string;
  offerName: string;
  endDate: string | null; // ISO
  subscriptionEurMonth: number;
  subscribedPowerKva: number | null;
  lines: CurrentLine[];
}

/** Supplier (Symphonics) proposal, per cadran, annualised. */
export interface ProposedLine {
  cadran: Cadran;
  electronEurMwh: number;
  annualVolumeMwh: number; // forecast annual volume from supplier
}

export interface Proposal {
  supplier: string; // "Symphonics"
  ceeEurMwh: number;
  capacityEurMwh: number;
  subscriptionEurMonth: number;
  marginEurMwh: number; // applied margin — hidden from client
  validUntil: string | null; // ISO
  termYears: number;
  lines: ProposedLine[];
}

export interface Signing {
  provider: "docuseal" | "mock";
  submissionId: string;
  url: string;
  signed: boolean;
}

export interface Dossier {
  id: string;
  clientName: string;
  siren?: string;
  contactName?: string;
  contactEmail?: string;
  pdl?: string;
  segment: Segment;
  files: { contract?: UploadedFile; bill?: UploadedFile };
  current?: CurrentContract;
  proposal?: Proposal;
  signing?: Signing;
  status: DossierStatus;
  createdAt: number;
  updatedAt: number;
}
