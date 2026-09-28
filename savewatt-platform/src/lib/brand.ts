import { APP_ORIGIN } from "./access/access-surface.ts";

/**
 * Zack AI brand constants shared by customer emails and offer documents.
 * Roles are fixed in every communication: Zack AI tracks and optimises the
 * customer's energy, Symphonics supplies it. Zack AI is a brand of AX TECH.
 */
export const BRAND = {
  name: "Zack AI",
  site: "https://heyzack.ai",
  siteLabel: "heyzack.ai",
  contactEmail: "contact@heyzack.ai",
  owner: "AX TECH — ECOLED WAVE CONCEPT",
  address: "8 rue Marbeau, 75016 Paris",
} as const;

export const SUPPLIER = {
  name: "Symphonics",
  site: "https://symphonics.fr/",
} as const;

/** Absolute URLs: email clients cannot resolve relative paths. */
export const BRAND_ASSETS = {
  logo: `${APP_ORIGIN}/brand/zack-ai-logo.png`,
  symphonicsLogo: `${APP_ORIGIN}/partners/symphonics-logo.png`,
} as const;

/** Palette: navy #243984, pink #e82f89, charcoal #333232, black, white. */
export const BRAND_COLORS = {
  navy: "#243984",
  navyDeep: "#1a2a66",
  pink: "#e82f89",
  ink: "#1d1d1b",
  muted: "#5d6275",
  faint: "#8b90a0",
  line: "#e3e5ee",
  surface: "#f4f5fa",
  navySoft: "#eef0f8",
  navyLine: "#cfd5ec",
} as const;

export const ROLE_STATEMENT_FR =
  "Zack AI vous aide à suivre et optimiser votre énergie. Symphonics est votre fournisseur d'énergie.";

export const LEGAL_LINE_FR = `${BRAND.name} est une marque d'AX TECH — ECOLED WAVE CONCEPT · ${BRAND.address}`;
