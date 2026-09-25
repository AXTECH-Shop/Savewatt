export const APP_ROLES = [
  "SUPER_ADMIN",
  "OPERATOR_FINANCE",
  "MASTER_ADMIN",
  "MASTER_BACKOFFICE",
  "SUB_REGIE_ADMIN",
  "TEAM_MANAGER",
  "APPORTEUR",
  "READ_ONLY",
  "CLIENT",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** The five roles the product exposes; the others are legacy DB values folded in by normalizeRole. */
export const ACTIVE_ROLES = ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN", "APPORTEUR", "CLIENT"] as const;

export type ActiveRole = (typeof ACTIVE_ROLES)[number];

const LEGACY_ROLE_MAP: Record<AppRole, ActiveRole> = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OPERATOR_FINANCE: "SUPER_ADMIN",
  MASTER_ADMIN: "MASTER_ADMIN",
  MASTER_BACKOFFICE: "MASTER_ADMIN",
  READ_ONLY: "MASTER_ADMIN",
  SUB_REGIE_ADMIN: "SUB_REGIE_ADMIN",
  TEAM_MANAGER: "SUB_REGIE_ADMIN",
  APPORTEUR: "APPORTEUR",
  CLIENT: "CLIENT",
};

export function normalizeRole(role: AppRole): ActiveRole {
  return LEGACY_ROLE_MAP[role];
}

export type ScopeKind =
  | "PLATFORM"
  | "SELF_DESCENDANTS"
  | "TEAM"
  | "OWNED"
  | "ASSIGNED"
  | "DOSSIER";

export interface WorkspaceActor {
  userId: string;
  displayName: string;
  email: string;
  role: AppRole;
  orgId: string;
  orgName: string;
  orgPath: string;
  scope: ScopeKind;
  isPreview: boolean;
}

const ROLE_SCOPE: Record<AppRole, ScopeKind> = {
  SUPER_ADMIN: "PLATFORM",
  OPERATOR_FINANCE: "PLATFORM",
  MASTER_ADMIN: "SELF_DESCENDANTS",
  MASTER_BACKOFFICE: "SELF_DESCENDANTS",
  SUB_REGIE_ADMIN: "SELF_DESCENDANTS",
  TEAM_MANAGER: "TEAM",
  APPORTEUR: "OWNED",
  READ_ONLY: "ASSIGNED",
  CLIENT: "DOSSIER",
};

const ROLE_HOME: Record<AppRole, string> = {
  SUPER_ADMIN: "/pipeline",
  OPERATOR_FINANCE: "/pipeline",
  MASTER_ADMIN: "/pipeline",
  MASTER_BACKOFFICE: "/pipeline",
  SUB_REGIE_ADMIN: "/pipeline",
  TEAM_MANAGER: "/pipeline",
  APPORTEUR: "/pipeline",
  READ_ONLY: "/pipeline",
  CLIENT: "/customer",
};

const ROLE_LABELS: Record<AppRole, { fr: string; en: string }> = {
  SUPER_ADMIN: { fr: "Admin SaveWatt", en: "SaveWatt admin" },
  OPERATOR_FINANCE: { fr: "Admin SaveWatt", en: "SaveWatt admin" },
  MASTER_ADMIN: { fr: "Régie", en: "Agency" },
  MASTER_BACKOFFICE: { fr: "Régie", en: "Agency" },
  SUB_REGIE_ADMIN: { fr: "Sous-régie", en: "Sub-agency" },
  TEAM_MANAGER: { fr: "Sous-régie", en: "Sub-agency" },
  APPORTEUR: { fr: "Apporteur", en: "Referrer" },
  READ_ONLY: { fr: "Régie", en: "Agency" },
  CLIENT: { fr: "Client", en: "Customer" },
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function scopeForRole(role: AppRole): ScopeKind {
  return ROLE_SCOPE[role];
}

export function homeForRole(role: AppRole): string {
  return ROLE_HOME[role];
}

export function labelForRole(role: AppRole, locale: string): string {
  return locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].fr;
}

export function pathIsInScope(actor: WorkspaceActor, resourcePath: string): boolean {
  if (actor.scope === "PLATFORM") return true;
  if (actor.scope === "DOSSIER") return resourcePath === actor.orgPath;
  if (actor.scope === "OWNED") return resourcePath === `${actor.orgPath}.${actor.userId}`;
  if (actor.scope === "ASSIGNED") return resourcePath === actor.orgPath;
  return resourcePath === actor.orgPath || resourcePath.startsWith(`${actor.orgPath}.`);
}

export function canManageNetwork(role: AppRole): boolean {
  return ["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"].includes(role);
}

export function canSeeFinance(role: AppRole): boolean {
  return ["SUPER_ADMIN", "OPERATOR_FINANCE", "MASTER_ADMIN"].includes(role);
}

export function canCreateDossier(role: AppRole): boolean {
  return [
    "SUPER_ADMIN",
    "MASTER_ADMIN",
    "MASTER_BACKOFFICE",
    "SUB_REGIE_ADMIN",
    "TEAM_MANAGER",
    "APPORTEUR",
  ].includes(role);
}
