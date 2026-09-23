import type { Locale } from "./routing";

/**
 * Makes supported locales first-class TypeScript values. Catalog parity and ICU
 * variables are validated by `catalog.test.mjs`.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
  }
}

export {};
