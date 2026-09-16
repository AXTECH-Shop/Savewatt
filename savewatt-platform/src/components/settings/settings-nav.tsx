"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/components/workspace-provider";

const adminItems = [
  ["/settings/workflows", "Workflow"],
  ["/settings/margins", "Marges"],
  ["/settings/commissions", "Commissions"],
  ["/settings/templates", "Documents"],
  ["/settings/branding", "Marque"],
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const { actor } = useWorkspace();
  const canAdminister = ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(actor.role);
  const items = canAdminister ? [...adminItems, ["/settings/sessions", "Sessions"] as const] : [["/settings/sessions", "Sessions"] as const];

  return (
    <nav aria-label="Paramètres" className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "press whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
            pathname === href ? "border-accent text-accent-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
