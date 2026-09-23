"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("locale");

  return (
    <div
      aria-label={t("label")}
      className="inline-flex items-center rounded-[0.55rem] border border-line-strong bg-surface p-0.5"
      role="group"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={cn(
            "press rounded-[0.4rem] px-2 py-1 text-[12px] font-medium uppercase tracking-wide",
            l === locale ? "bg-accent text-white" : "text-muted hover:text-ink",
          )}
          aria-label={t("switchTo", { language: t(l) })}
          aria-pressed={l === locale}
          lang={l}
          title={t("switchTo", { language: t(l) })}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
