import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OfferDeliveryManager } from "@/lib/offers/offer-delivery-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const kind = new URL(request.url).searchParams.get("kind") === "marketing" ? "marketing" : "budget";
    const pdf = await new OfferDeliveryManager().getPdf(actor, id, kind);
    if (!pdf) {
      return NextResponse.json({ error: "CRM_NOT_FOUND" }, { status: 404 });
    }
    return new Response(pdf.bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${pdf.fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return api.error(error);
  }
}
