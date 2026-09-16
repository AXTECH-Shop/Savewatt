import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // French is the product default; English is provided so the team can follow along.
  locales: ["fr", "en"],
  defaultLocale: "fr",
});

export type Locale = (typeof routing.locales)[number];
