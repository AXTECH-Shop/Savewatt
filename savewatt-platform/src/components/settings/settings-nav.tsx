"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/components/workspace-provider";

// Grid internals and pass-through rates are SaveWatt-only (régie roles 403).
const internalItems = [
  ["/settings/margins", "margins"],
  ["/settings/pricing", "pricing"],
  ["/settings/symphonics", "symphonics"],
] as const;

const networkItems = [
  ["/settings/commissions", "commissions"],
  ["/settings/workflows", "workflows"],
  ["/settings/templates", "documents"],
] as const;

export function SettingsNav() {
  const t = useTranslations("settingsNav");
  const pathname = usePathname();
  const { actor } = useWorkspace();
  const isInternal = actor.role === "SUPER_ADMIN";
  const canAdminister = ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role);
  const items = [...(isInternal ? internalItems : []), ...(canAdminister ? networkItems : [])];

  return (
    <nav aria-label={t("label")} className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "press whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
            pathname === href ? "border-accent text-accent-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
