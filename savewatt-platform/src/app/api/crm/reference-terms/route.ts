import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { ReferenceTermsRepository } from "@/lib/intake/reference-terms-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET() {
  try {
    const actor = await api.actor();
    return NextResponse.json({ referenceTerms: await new ReferenceTermsRepository().resolveActive(actor) });
  } catch (error) {
    return api.error(error);
  }
}

/** New version of the standing Symphonics price sheet (previous one superseded). */
export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const referenceTerms = await new ReferenceTermsRepository().create(actor, await api.json(request));
    return NextResponse.json({ referenceTerms }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
