import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmManager } from "@/lib/crm/crm-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    return NextResponse.json(await new CrmManager().getDossierActivity(actor, id));
  } catch (error) {
    return api.error(error);
  }
}

