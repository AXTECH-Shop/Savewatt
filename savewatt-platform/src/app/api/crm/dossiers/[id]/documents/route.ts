import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { DocumentManager } from "@/lib/documents/document-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const documents = await new DocumentManager().list(actor, id);
    return NextResponse.json({ documents });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    const document = await new DocumentManager().upload(
      actor,
      id,
      form.get("kind"),
      file,
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}

