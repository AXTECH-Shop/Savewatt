import type { AppRole } from "@/lib/access-control";

export const APP_ORIGIN = "https://app.savewatt.fr";
export const ADMIN_ORIGIN = "https://admin.savewatt.fr";

export type AccessSurface = "APP" | "ADMIN";

const INTERNAL_ROLES: AppRole[] = ["SUPER_ADMIN", "OPERATOR_FINANCE"];

export function resolveAccessSurface(host: string | null): AccessSurface {
  const hostname = host?.trim().toLowerCase().split(":")[0];
  return hostname === "admin.savewatt.fr" ? "ADMIN" : "APP";
}

export function isInternalRole(role: AppRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

export function originForSurface(surface: AccessSurface): string {
  return surface === "ADMIN" ? ADMIN_ORIGIN : APP_ORIGIN;
}
