"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/components/workspace-provider";

const adminItems = [
  ["/settings/workflows", "workflows"],
  ["/settings/commissions", "commissions"],
  ["/settings/templates", "documents"],
  ["/settings/branding", "branding"],
] as const;

// Grid internals and pass-through rates are operator-only (régie roles 403).
const internalItems = [
  ["/settings/margins", "margins"],
  ["/settings/pricing", "pricing"],
] as const;

export function SettingsNav() {
  const t = useTranslations("settingsNav");
  const pathname = usePathname();
  const { actor } = useWorkspace();
  const isInternal = ["SUPER_ADMIN", "OPERATOR_FINANCE"].includes(actor.role);
  const canAdminister = ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role);
  const items = [
    ...(isInternal ? internalItems : []),
    ...(canAdminister ? adminItems : []),
    ["/settings/sessions", "sessions"] as const,
  ];

  return (
    <nav aria-label={t("label")} className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
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
