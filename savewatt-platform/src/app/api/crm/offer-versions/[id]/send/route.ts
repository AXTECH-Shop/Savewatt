import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { OfferDeliveryManager } from "@/lib/offers/offer-delivery-manager";

export const runtime = "nodejs";
export const maxDuration = 60;

const api = new CrmApiManager();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const body = (await api.json(request)) as Record<string, unknown>;
    const recipientEmail =
      typeof body.recipientEmail === "string" && body.recipientEmail.trim()
        ? body.recipientEmail
        : null;
    const delivery = await new OfferDeliveryManager().send(actor, id, {
      recipientEmail,
      idempotencyKey: request.headers.get("x-idempotency-key") ?? "",
    });
    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    if (error instanceof CrmError && error.code === "CRM_UNAVAILABLE") {
      return NextResponse.json(
        { error: error.code, field: error.field, hint: "Configure RESEND_API_KEY and the BROWSER binding." },
        { status: error.status },
      );
    }
    return api.error(error);
  }
}
