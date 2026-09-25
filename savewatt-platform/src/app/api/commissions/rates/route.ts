import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { CommissionRateRepository } from "@/lib/commissions/commission-rate-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET() {
  try {
    const actor = await api.actor();
    return NextResponse.json(await new CommissionRateRepository().listTree(actor));
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const body = (await api.json(request)) as Record<string, unknown>;
    if (typeof body.organizationId !== "string" || !body.organizationId) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "organizationId");
    }
    const rate = await new CommissionRateRepository().setRate(
      actor,
      body.organizationId,
      body.ratePercent,
      body.note,
    );
    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
