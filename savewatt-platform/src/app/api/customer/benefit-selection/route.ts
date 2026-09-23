import { NextResponse } from "next/server";
import {
  CustomerBenefitRepository,
  isCustomerBenefitType,
} from "@/lib/gifting/customer-benefit-repository";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";

interface BenefitSelectionBody {
  dossierId?: unknown;
  benefitType?: unknown;
}

export async function POST(request: Request) {
  let actor;
  try {
    actor = await resolveServerActor();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    throw error;
  }

  if (actor.role !== "CLIENT") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as BenefitSelectionBody;
  const dossierId = typeof body.dossierId === "string" ? body.dossierId.trim() : "";
  if (!dossierId || !isCustomerBenefitType(body.benefitType)) {
    return NextResponse.json({ error: "INVALID_BENEFIT_SELECTION" }, { status: 400 });
  }

  const repository = new CustomerBenefitRepository();
  const selected = await repository.selectForCustomer(
    actor.userId,
    dossierId,
    body.benefitType,
  );
  if (!selected) {
    return NextResponse.json({ error: "DOSSIER_NOT_FOUND_OR_FORBIDDEN" }, { status: 404 });
  }

  return NextResponse.json({ benefitType: body.benefitType, status: "SELECTED" });
}
