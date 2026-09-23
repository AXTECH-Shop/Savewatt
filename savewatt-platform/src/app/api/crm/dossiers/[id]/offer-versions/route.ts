import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OfferManager } from "@/lib/offers/offer-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const offerVersions = await new OfferManager().listOfferVersions(actor, id);
    return NextResponse.json({ offerVersions });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const offerVersion = await new OfferManager().createOfferVersion(actor, id, await api.json(request));
    return NextResponse.json({ offerVersion }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
