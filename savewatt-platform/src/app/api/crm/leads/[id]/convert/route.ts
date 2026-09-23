import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmManager } from "@/lib/crm/crm-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const conversion = await new CrmManager().convertLead(actor, id);
    return NextResponse.json(conversion);
  } catch (error) {
    return api.error(error);
  }
}

