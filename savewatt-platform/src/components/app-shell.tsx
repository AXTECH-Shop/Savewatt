"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  Briefcase,
  Buildings,
  CalendarBlank,
  ChartLineUp,
  Checks,
  CirclesFour,
  FilePlus,
  Files,
  Gift,
  House,
  List,
  MagnifyingGlass,
  Money,
  Receipt,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  TreeStructure,
  UsersThree,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Link, usePathname } from "@/i18n/navigation";
import {
  APP_ROLES,
  homeForRole,
  labelForRole,
  type AppRole,
} from "@/lib/access-control";
import { cn } from "@/lib/cn";
import { BrandLockup } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { useWorkspace } from "./workspace-provider";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  roles: AppRole[];
  exact?: boolean;
}

const operatorRoles: AppRole[] = ["SUPER_ADMIN"];
const financeRoles: AppRole[] = ["SUPER_ADMIN", "OPERATOR_FINANCE"];
const masterRoles: AppRole[] = ["MASTER_ADMIN", "SUB_REGIE_ADMIN"];
const internalRoles: AppRole[] = APP_ROLES.filter((role) => role !== "CLIENT");

const NAV_ITEMS: NavItem[] = [
  { href: "/operator", label: "Vue opérateur", icon: CirclesFour, roles: operatorRoles, exact: true },
  { href: "/operator/masters", label: "Régies", icon: Buildings, roles: operatorRoles },
  { href: "/operator/symphonics", label: "Tarifs fournisseur", icon: SlidersHorizontal, roles: operatorRoles },
  { href: "/operator/regulatory", label: "Paramètres réglementaires", icon: SlidersHorizontal, roles: operatorRoles },
  { href: "/operator/audit", label: "Journal d’audit", icon: ShieldCheck, roles: operatorRoles },
  { href: "/finance/close", label: "Clôture mensuelle", icon: Receipt, roles: financeRoles },
  { href: "/finance/reconciliation", label: "Rapprochement", icon: Checks, roles: financeRoles },
  { href: "/finance/invoices", label: "Factures", icon: Files, roles: financeRoles },
  { href: "/finance/consumption", label: "Import consommations", icon: FilePlus, roles: financeRoles },
  { href: "/finance/exports", label: "Exports comptables", icon: Receipt, roles: financeRoles },
  { href: "/portfolio", label: "Portefeuille", icon: Briefcase, roles: [...masterRoles, "READ_ONLY"] },
  { href: "/org", label: "Organisation", icon: TreeStructure, roles: masterRoles, exact: true },
  { href: "/org/users", label: "Utilisateurs", icon: UsersThree, roles: masterRoles },
  { href: "/backoffice/queue", label: "Validations", icon: Checks, roles: ["MASTER_ADMIN", "MASTER_BACKOFFICE"] },
  { href: "/team/pipeline", label: "Pipeline équipe", icon: ChartLineUp, roles: ["TEAM_MANAGER"] },
  { href: "/team/performance", label: "Performance", icon: UsersThree, roles: ["TEAM_MANAGER"] },
  { href: "/pipeline", label: "Mes dossiers", icon: House, roles: ["APPORTEUR", "READ_ONLY"], exact: true },
  { href: "/new", label: "Nouveau dossier", icon: FilePlus, roles: ["APPORTEUR"] },
  { href: "/commissions", label: "Commissions", icon: Money, roles: [...masterRoles, "TEAM_MANAGER", "APPORTEUR"] },
  { href: "/wallet", label: "Avantages", icon: Gift, roles: ["APPORTEUR"] },
  { href: "/echeancier", label: "Échéancier", icon: CalendarBlank, roles: internalRoles },
  { href: "/customer", label: "Mon contrat", icon: Receipt, roles: ["CLIENT"], exact: true },
  { href: "/customer/documents", label: "Mes documents", icon: Files, roles: ["CLIENT"] },
  { href: "/settings/workflows", label: "Paramètres", icon: SlidersHorizontal, roles: ["SUPER_ADMIN", ...masterRoles] },
  { href: "/settings/sessions", label: "Sécurité du compte", icon: ShieldCheck, roles: [...APP_ROLES] },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { actor } = useWorkspace();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(actor.role));

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: IconComponent, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "press flex min-h-10 items-center gap-3 rounded-[0.65rem] px-3 py-2 text-sm font-medium",
              active
                ? "bg-accent-soft text-accent-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <IconComponent size={18} weight={active ? "fill" : "regular"} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceIdentity() {
  const locale = useLocale();
  const { actor, canPreviewRoles, setPreviewRole } = useWorkspace();

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-deep text-sm font-semibold text-lime">
          {actor.orgName
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{actor.orgName}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{labelForRole(actor.role, locale)}</p>
        </div>
      </div>
      {canPreviewRoles && (
        <label className="mt-3 block border-t border-line pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
          Aperçu rôle
          <select
            value={actor.role}
            onChange={(event) => setPreviewRole(event.target.value as AppRole)}
            className="mt-1.5 h-9 w-full rounded-lg border border-line-strong bg-surface px-2 text-xs normal-case tracking-normal text-ink"
          >
            {APP_ROLES.map((role) => (
              <option key={role} value={role}>
                {labelForRole(role, locale)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function MobileDrawer({ open, close }: { open: boolean; close: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button className="absolute inset-0 bg-deep/45" onClick={close} aria-label="Fermer le menu" />
      <div className="absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col bg-surface px-4 py-5 shadow-diffuse">
        <div className="flex items-center justify-between px-2">
          <BrandLockup />
          <button ref={closeButton} onClick={close} className="press rounded-lg p-2 text-muted" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 overflow-y-auto">
          <NavLinks onNavigate={close} />
        </div>
        <div className="mt-auto pt-4">
          <WorkspaceIdentity />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const { actor } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1600px]">
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href={homeForRole(actor.role)} className="px-2" aria-label="Accueil SaveWatt">
          <BrandLockup />
        </Link>
        <p className="mt-1 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
          Plateforme commerciale
        </p>
        <div className="mt-7 flex-1 overflow-y-auto pr-1">
          <NavLinks />
        </div>
        <div className="mt-4 space-y-3">
          <WorkspaceIdentity />
          <div className="flex items-center justify-between px-2">
            <LocaleSwitcher />
            <SignOutButton>
              <button className="press inline-flex h-9 items-center gap-2 rounded-lg px-2 text-xs text-muted hover:bg-surface-2 hover:text-ink">
                <SignOut size={16} /> {t("signOut")}
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {actor.isPreview && (
          <div className="border-b border-lime/35 bg-lime/15 px-4 py-2 text-center text-xs font-medium text-deep">
            Aperçu de démonstration — les permissions réelles restent contrôlées par Clerk et la couche serveur.
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="press rounded-lg border border-line p-2 text-ink lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <List size={19} />
          </button>
          <div className="lg:hidden">
            <BrandLockup />
          </div>
          <label className="ml-auto hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 md:flex">
            <MagnifyingGlass size={16} className="text-faint" />
            <span className="sr-only">Rechercher</span>
            <input
              type="search"
              placeholder="Rechercher un client, un PDL ou un dossier"
              className="h-9 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘ K</kbd>
          </label>
          <Link href="/notifications" className="press relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Notifications">
            <Bell size={19} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
          </Link>
          <UserButton />
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <MobileDrawer open={open} close={() => setOpen(false)} />
    </div>
  );
}
