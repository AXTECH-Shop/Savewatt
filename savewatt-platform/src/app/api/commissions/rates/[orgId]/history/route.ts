import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CommissionRateRepository } from "@/lib/commissions/commission-rate-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const actor = await api.actor();
    const { orgId } = await params;
    const versions = await new CommissionRateRepository().history(actor, orgId);
    return NextResponse.json({ versions });
  } catch (error) {
    return api.error(error);
  }
}
