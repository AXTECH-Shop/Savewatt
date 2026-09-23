import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { ExtractionManager } from "@/lib/extraction/extraction-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const body = await api.json(request);
    if (!body || typeof body !== "object" || Array.isArray(body) || !("bill" in body)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "bill");
    }
    const validated = {
      bill: (body as { bill: unknown }).bill as import("@/lib/extraction/schema").ExtractedBill,
      fieldConfidence: [],
      overallConfidence: 1,
      warnings: [],
    };
    const extraction = await new ExtractionManager().saveValidated(actor, id, validated);
    return NextResponse.json({ extraction });
  } catch (error) {
    return api.error(error);
  }
}
