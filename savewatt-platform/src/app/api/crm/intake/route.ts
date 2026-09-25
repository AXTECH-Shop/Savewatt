import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { IntakeManager } from "@/lib/intake/intake-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

function field(form: FormData, key: string, max: number): string | null {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function GET() {
  try {
    const actor = await api.actor();
    return NextResponse.json({ submissions: await new IntakeManager().list(actor) });
  } catch (error) {
    return api.error(error);
  }
}

/** Admin: upload a bill → the lead + dossier are created from the bill details. */
export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    }
    const file = form.get("file");
    if (!file || typeof file === "string") throw new CrmError("CRM_INVALID_INPUT", 400, "file");
    const email = field(form, "email", 254)?.toLowerCase() ?? null;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new CrmError("CRM_INVALID_INPUT", 400, "email");
    const manager = new IntakeManager();
    const submissionId = await manager.receive(actor, file, {
      channel: "ADMIN",
      contact: {
        name: field(form, "name", 180),
        email,
        phone: field(form, "phone", 40),
        company: field(form, "company", 180),
      },
    });
    const submission = await manager.analyze(actor, submissionId);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
