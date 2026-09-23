import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { ExtractionManager } from "@/lib/extraction/extraction-manager";

export const runtime = "nodejs";
export const maxDuration = 60;

const api = new CrmApiManager();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const extractions = await new ExtractionManager().listForDocument(actor, id);
    return NextResponse.json({ extractions });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const extraction = await new ExtractionManager().run(actor, id);
    return NextResponse.json({ extraction }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
