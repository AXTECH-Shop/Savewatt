"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="inline-flex items-center rounded-[0.55rem] border border-line-strong bg-surface p-0.5">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={cn(
            "press rounded-[0.4rem] px-2 py-1 text-[12px] font-medium uppercase tracking-wide",
            l === locale ? "bg-accent text-white" : "text-muted hover:text-ink",
          )}
          aria-pressed={l === locale}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
