import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmManager } from "@/lib/crm/crm-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(request: Request) {
  try {
    const actor = await api.actor();
    const status = new URL(request.url).searchParams.get("status");
    const dossiers = await new CrmManager().listDossiers(actor, status);
    return NextResponse.json({ dossiers });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const dossier = await new CrmManager().createDossier(actor, await api.json(request));
    return NextResponse.json({ dossier }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}

