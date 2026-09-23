import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { LeadImportManager } from "@/lib/crm/lead-import-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const idempotencyKey = request.headers.get("x-idempotency-key") ?? "";
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    }
    const result = await new LeadImportManager().import(actor, {
      buffer: await file.arrayBuffer(),
      idempotencyKey,
      fileName: file.name,
    });
    return NextResponse.json({ import: result }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    return api.error(error);
  }
}
