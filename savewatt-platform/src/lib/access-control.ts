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
  SUPER_ADMIN: "/operator",
  OPERATOR_FINANCE: "/finance/close",
  MASTER_ADMIN: "/portfolio",
  MASTER_BACKOFFICE: "/backoffice/queue",
  SUB_REGIE_ADMIN: "/portfolio",
  TEAM_MANAGER: "/team/pipeline",
  APPORTEUR: "/pipeline",
  READ_ONLY: "/portfolio",
  CLIENT: "/customer",
};

const ROLE_LABELS: Record<AppRole, { fr: string; en: string }> = {
  SUPER_ADMIN: { fr: "Opérateur SaveWatt", en: "SaveWatt operator" },
  OPERATOR_FINANCE: { fr: "Finance opérateur", en: "Operator finance" },
  MASTER_ADMIN: { fr: "Administrateur régie", en: "Agency administrator" },
  MASTER_BACKOFFICE: { fr: "Back-office régie", en: "Agency back office" },
  SUB_REGIE_ADMIN: { fr: "Administrateur sous-régie", en: "Sub-agency administrator" },
  TEAM_MANAGER: { fr: "Responsable d’équipe", en: "Team manager" },
  APPORTEUR: { fr: "Apporteur", en: "Business introducer" },
  READ_ONLY: { fr: "Lecture seule", en: "Read only" },
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
