import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import type { SeasonalCadran, TurpeVariableRates } from "@/lib/offers/estimate";
import { canSeeInternalPricing } from "@/lib/offers/offer-visibility";
import { PricingParameterRepository } from "@/lib/offers/pricing-parameter-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEASONAL_CADRANS: SeasonalCadran[] = ["HPH", "HCH", "HPE", "HCE"];

/** Pass-through rates are operator-internal: régie roles get 403, never data. */
function assertInternal(actor: { role: Parameters<typeof canSeeInternalPricing>[0] }): void {
  if (!canSeeInternalPricing(actor.role)) throw new CrmError("CRM_FORBIDDEN", 403);
}

function rate(value: unknown, field: string, { max }: { max?: number } = {}): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (max !== undefined && parsed > max)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  return parsed;
}

export async function GET() {
  try {
    const actor = await api.actor();
    assertInternal(actor);
    const repository = new PricingParameterRepository();
    const [effective, versions] = await Promise.all([
      repository.resolveEffective(actor),
      repository.list(actor),
    ]);
    return NextResponse.json({ pricingParameters: effective, versions });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    assertInternal(actor);
    const body = (await api.json(request)) as Record<string, unknown>;
    const turpeFixed = (body.turpeFixed ?? {}) as Record<string, unknown>;
    const turpeVariableInput = (body.turpeVariable ?? {}) as Record<string, unknown>;
    const turpeVariable: TurpeVariableRates = {};
    for (const cadran of SEASONAL_CADRANS) {
      turpeVariable[cadran] = rate(turpeVariableInput[cadran], `turpeVariable.${cadran}`);
    }
    const params = await new PricingParameterRepository().create(actor, {
      organizationId: actor.orgId,
      ceeEurMwh: rate(body.ceeEurMwh, "ceeEurMwh"),
      capacityEurMwh: rate(body.capacityEurMwh, "capacityEurMwh"),
      acciseEurMwh: rate(body.acciseEurMwh, "acciseEurMwh"),
      ctaRate: rate(body.ctaRate, "ctaRate", { max: 1 }),
      tvaRate: rate(body.tvaRate, "tvaRate", { max: 1 }),
      turpeFixed: {
        gestionCentsPerDay: rate(turpeFixed.gestionCentsPerDay, "turpeFixed.gestionCentsPerDay"),
        comptageCentsPerDay: rate(turpeFixed.comptageCentsPerDay, "turpeFixed.comptageCentsPerDay"),
        soutirageFixeCentsPerKwPerDay: rate(
          turpeFixed.soutirageFixeCentsPerKwPerDay,
          "turpeFixed.soutirageFixeCentsPerKwPerDay",
        ),
      },
      turpeVariable,
      effectiveFrom:
        typeof body.effectiveFrom === "string" && DATE_PATTERN.test(body.effectiveFrom)
          ? body.effectiveFrom
          : new Date().toISOString().slice(0, 10),
      effectiveTo:
        typeof body.effectiveTo === "string" && DATE_PATTERN.test(body.effectiveTo)
          ? body.effectiveTo
          : null,
    });
    return NextResponse.json({ pricingParameters: params }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
