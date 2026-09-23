import { defineRouting } from "next-intl/routing";

/**
 * Supported product locales. Keep this list in sync with the message loaders in
 * `request.ts`; the catalog parity test enforces the matching message shape.
 */
export const locales = ["fr", "en"] as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export const routing = defineRouting({
  // French remains the product default. Both languages keep an explicit prefix
  // so public and internal host routing remains predictable.
  locales,
  defaultLocale: "fr",
  localePrefix: "always",
});
