import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { IntakeManager } from "@/lib/intake/intake-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const body = (await api.json(request)) as Record<string, unknown>;
    const delivery = await new IntakeManager().send(actor, id, {
      recipientEmail: typeof body.recipientEmail === "string" && body.recipientEmail.trim() ? body.recipientEmail : null,
      idempotencyKey: request.headers.get("x-idempotency-key") ?? "",
    });
    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    if (error instanceof CrmError && error.code === "CRM_UNAVAILABLE") {
      return NextResponse.json({ error: error.code, field: error.field }, { status: error.status });
    }
    return api.error(error);
  }
}
