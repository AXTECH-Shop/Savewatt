import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR, enUS } from "@clerk/localizations";
import { routing } from "@/i18n/routing";
import "../globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SaveWatt — Plateforme commerciale énergie",
  description: "Pilotez les dossiers clients, les offres, les signatures et les commissions SaveWatt.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${outfit.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <ClerkProvider localization={locale === "fr" ? frFR : enUS}>
          <NextIntlClientProvider>
            {children}
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
