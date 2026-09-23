import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
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
    const dossier = await new CrmManager().getDossier(actor, id);
    if (!dossier) throw new CrmError("CRM_NOT_FOUND", 404);
    return NextResponse.json({ dossier });
  } catch (error) {
    return api.error(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const dossier = await new CrmManager().updateDossierStatus(
      actor,
      id,
      await api.json(request),
    );
    return NextResponse.json({ dossier });
  } catch (error) {
    return api.error(error);
  }
}

