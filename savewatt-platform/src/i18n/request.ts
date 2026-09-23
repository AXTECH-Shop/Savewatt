import { getRequestConfig } from "next-intl/server";
import { isLocale, type Locale, routing } from "./routing";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

const messagesByLocale: Record<Locale, typeof fr> = {
  fr,
  en,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
    timeZone: "Europe/Paris",
  };
});
