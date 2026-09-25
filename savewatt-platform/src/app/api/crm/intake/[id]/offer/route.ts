import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { IntakeManager } from "@/lib/intake/intake-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

/** Validate the bill fields + Symphonics terms and create the offer version. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const offerVersion = await new IntakeManager().createOffer(actor, id, await api.json(request));
    return NextResponse.json({ offerVersion }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
