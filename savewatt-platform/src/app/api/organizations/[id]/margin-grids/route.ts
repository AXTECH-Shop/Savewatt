import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import type { AppRole } from "@/lib/access-control";
import { MarginGridRepository } from "@/lib/offers/margin-grid-repository";
import { canSeeInternalPricing } from "@/lib/offers/offer-visibility";
import type { MarginGridRoleScope } from "@/lib/offers/offer-types";

export const runtime = "nodejs";

const api = new CrmApiManager();

/**
 * Margin grids are operator-internal: régie roles (MASTER_ADMIN,
 * SUB_REGIE_ADMIN included) get 403 — they never read grid internals.
 */
function assertGridAdmin(actor: { role: AppRole; orgId: string }, organizationId: string): void {
  if (!canSeeInternalPricing(actor.role)) throw new CrmError("CRM_FORBIDDEN", 403);
  if (actor.role !== "SUPER_ADMIN" && actor.orgId !== organizationId) {
    throw new CrmError("CRM_FORBIDDEN", 403);
  }
}

function roleScope(value: unknown): MarginGridRoleScope {
  if (value === undefined || value === null) return "ADMIN";
  if (value === "ADMIN" || value === "REGIE") return value;
  throw new CrmError("CRM_INVALID_INPUT", 400, "roleScope");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    assertGridAdmin(actor, id);
    // Repositories scope by actor.orgId; listing another org's grids is forbidden here.
    // Both ADMIN and REGIE grids are returned (records carry roleScope).
    const grids = actor.orgId === id ? await new MarginGridRepository().list(actor) : [];
    return NextResponse.json({ marginGrids: grids });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    assertGridAdmin(actor, id);
    if (actor.orgId !== id) {
      throw new CrmError("CRM_FORBIDDEN", 403);
    }
    const body = (await api.json(request)) as Record<string, unknown>;
    const grid = await new MarginGridRepository().create(actor, {
      organizationId: id,
      roleScope: roleScope(body.roleScope),
      minMarginEurMwh: Number(body.minMarginEurMwh),
      defaultMarginEurMwh: Number(body.defaultMarginEurMwh),
      maxMarginEurMwh: Number(body.maxMarginEurMwh),
      effectiveFrom:
        typeof body.effectiveFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveFrom)
          ? body.effectiveFrom
          : new Date().toISOString().slice(0, 10),
      effectiveTo:
        typeof body.effectiveTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveTo)
          ? body.effectiveTo
          : null,
    });
    return NextResponse.json({ marginGrid: grid }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
