import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandLockup } from "@/components/brand";
import { isLocale } from "@/i18n/routing";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("intake.public");

  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLockup />
          <a
            href="https://symphonics.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg bg-white px-2.5 py-1.5"
          >
            <span className="hidden text-xs text-neutral-500 sm:inline">{t("partnerLabel")}</span>
            <Image src="/partners/symphonics-logo.png" alt="Symphonics" width={768} height={263} className="h-7 w-auto" />
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-14">{children}</main>
    </div>
  );
}
