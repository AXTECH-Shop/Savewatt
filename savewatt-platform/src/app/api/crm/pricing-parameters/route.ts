import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import type { ConsumptionProfile, SeasonalCadran, SiteRates, TurpeFixedRates, TurpeVariableRates } from "@/lib/offers/estimate";
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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function turpeFixed(value: unknown, prefix: string): TurpeFixedRates {
  const input = record(value);
  return {
    gestionCentsPerDay: rate(input.gestionCentsPerDay, `${prefix}.gestionCentsPerDay`),
    comptageCentsPerDay: rate(input.comptageCentsPerDay, `${prefix}.comptageCentsPerDay`),
    soutirageFixeCentsPerKwPerDay: rate(input.soutirageFixeCentsPerKwPerDay, `${prefix}.soutirageFixeCentsPerKwPerDay`),
  };
}

function turpeVariable(value: unknown, prefix: string): TurpeVariableRates {
  const input = record(value);
  const rates: TurpeVariableRates = {};
  for (const cadran of SEASONAL_CADRANS) rates[cadran] = rate(input[cadran], `${prefix}.${cadran}`);
  return rates;
}

function smallSiteRates(value: unknown): SiteRates | null {
  if (value === undefined || value === null) return null;
  const input = record(value);
  return {
    acciseEurMwh: rate(input.acciseEurMwh, "smallSiteRates.acciseEurMwh"),
    turpeFixed: turpeFixed(input.turpeFixed, "smallSiteRates.turpeFixed"),
    turpeVariable: turpeVariable(input.turpeVariable, "smallSiteRates.turpeVariable"),
  };
}

function consumptionProfile(value: unknown): ConsumptionProfile | null {
  if (value === undefined || value === null) return null;
  const input = record(value);
  const profile = {} as ConsumptionProfile;
  for (const cadran of SEASONAL_CADRANS) profile[cadran] = rate(input[cadran], `consumptionProfile.${cadran}`, { max: 100 });
  const total = SEASONAL_CADRANS.reduce((sum, cadran) => sum + profile[cadran], 0);
  if (Math.abs(total - 100) > 0.5) throw new CrmError("CRM_INVALID_INPUT", 400, "consumptionProfile");
  return profile;
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
    const params = await new PricingParameterRepository().create(actor, {
      organizationId: actor.orgId,
      ceeEurMwh: rate(body.ceeEurMwh, "ceeEurMwh"),
      capacityEurMwh: rate(body.capacityEurMwh, "capacityEurMwh"),
      acciseEurMwh: rate(body.acciseEurMwh, "acciseEurMwh"),
      ctaRate: rate(body.ctaRate, "ctaRate", { max: 1 }),
      tvaRate: rate(body.tvaRate, "tvaRate", { max: 1 }),
      turpeFixed: turpeFixed(body.turpeFixed, "turpeFixed"),
      turpeVariable: turpeVariable(body.turpeVariable, "turpeVariable"),
      smallSiteRates: smallSiteRates(body.smallSiteRates),
      consumptionProfile: consumptionProfile(body.consumptionProfile),
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
