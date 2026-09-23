import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmManager } from "@/lib/crm/crm-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const task = await new CrmManager().updateTaskStatus(actor, id, await api.json(request));
    return NextResponse.json({ task });
  } catch (error) {
    return api.error(error);
  }
}
