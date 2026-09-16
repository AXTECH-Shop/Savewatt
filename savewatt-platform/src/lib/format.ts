const localeTag = (locale: string) => (locale === "en" ? "en-GB" : "fr-FR");

export function eur(n: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function num(n: number, locale: string, digits = 2): string {
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function dateStr(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
}
