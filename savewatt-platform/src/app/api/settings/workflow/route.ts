import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { WorkflowRepository } from "@/lib/workflows/workflow-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET() {
  try {
    const actor = await api.actor();
    const repository = new WorkflowRepository();
    const [effective, history] = await Promise.all([
      repository.resolveEffective(actor),
      repository.history(actor),
    ]);
    return NextResponse.json({ effective, history });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const body = (await api.json(request)) as Record<string, unknown>;
    const version = await new WorkflowRepository().publish(actor, body.stages, body.note);
    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
