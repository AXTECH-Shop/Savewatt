import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OfferManager } from "@/lib/offers/offer-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const offerVersion = await new OfferManager().approveOfferVersion(actor, id);
    return NextResponse.json({ offerVersion });
  } catch (error) {
    return api.error(error);
  }
}
