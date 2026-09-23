import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { MarginGridRepository } from "@/lib/offers/margin-grid-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

function assertGridAdmin(actor: { role: string; orgId: string }, organizationId: string): void {
  if (actor.role === "SUPER_ADMIN") return;
  if (
    (actor.role === "MASTER_ADMIN" || actor.role === "SUB_REGIE_ADMIN") &&
    actor.orgId === organizationId
  ) {
    return;
  }
  throw new CrmError("CRM_FORBIDDEN", 403);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    assertGridAdmin(actor, id);
    // Repositories scope by actor.orgId; listing another org's grids is forbidden here.
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
