import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * Bridge from Clerk identity to Savewatt's régie org model.
 *
 * Clerk `orgId` maps 1:1 to a future `organizations.id` (the régie/branch node in
 * the ltree hierarchy); Clerk `orgRole` maps to the RBAC role in specs/rights-matrix.md.
 * This is the single bridge that resolves "who is acting, in which régie" before
 * tenant-scoped D1 repositories run, so callers never read Clerk directly.
 */
export interface AuthContext {
  userId: string;
  /** Active Clerk organization = the régie/branch the user is acting within (null = personal). */
  orgId: string | null;
  /** Clerk org role, e.g. "org:admin" / "org:member" → mapped to Savewatt RBAC later. */
  orgRole: string | null;
  orgSlug: string | null;
}

/** Resolve the current request's auth context, or null when signed out. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId, orgId, orgRole, orgSlug } = await auth();
  if (!userId) return null;
  return {
    userId,
    orgId: orgId ?? null,
    orgRole: orgRole ?? null,
    orgSlug: orgSlug ?? null,
  };
}

/** Resolve the auth context, throwing when unauthenticated (use in protected server code). */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("UNAUTHENTICATED");
  return ctx;
}
