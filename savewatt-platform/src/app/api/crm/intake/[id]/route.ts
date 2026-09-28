import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { LeadDeletionManager } from "@/lib/crm/lead-deletion-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const deleted = await new LeadDeletionManager().deleteIntake(actor, id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return api.error(error);
  }
}
