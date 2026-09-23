import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmManager } from "@/lib/crm/crm-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const task = await new CrmManager().createTask(actor, await api.json(request));
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}

