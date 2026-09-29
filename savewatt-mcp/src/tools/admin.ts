import { isAppRole } from "@/lib/access-control";
import { sendAccessEmail } from "@/lib/access-management/access-email";
import { CrmError } from "@/lib/crm/crm-errors";
import type { SeasonalCadran, TurpeVariableRates } from "@/lib/offers/estimate";
import type { ToolDef } from "./registry.ts";
import { ADMIN, ADMIN_AND_FINANCE } from "./registry.ts";
import { isoDate, num, obj, oneOf, str } from "./validate.ts";

const ORG_KINDS = ["OPERATOR", "MASTER", "SUB_REGIE", "TEAM"] as const;
const ROLE_SCOPES = ["ADMIN", "REGIE"] as const;

export const adminTools: ToolDef[] = [
  {
    name: "organizations.create_master",
    description:
      "Create a child organization (default kind MASTER — a new régie) under a parent, with the platform's hierarchy policy checks.",
    status: "live",
    readOnly: false,
    scopes: ["admin:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        parentId: { type: "string", description: "Defaults to the token's organization." },
        kind: { type: "string", enum: [...ORG_KINDS], description: "Default MASTER." },
        name: { type: "string" },
        maxChildOrganizations: { type: "number" },
      },
      required: ["name"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const organization = await ctx.organizations.create(ctx.actor, {
        parentId: str(value.parentId, "parentId", { max: 100 }) ?? ctx.actor.orgId,
        kind: oneOf(value.kind, "kind", ORG_KINDS, false) ?? "MASTER",
        name: str(value.name, "name", { required: true, max: 120 }),
        maxChildOrganizations: num(value.maxChildOrganizations, "maxChildOrganizations", { min: 0, integer: true }),
      });
      return { organization };
    },
  },
  {
    name: "margin_grids.create_version",
    description:
      "Publish a new margin grid version (min/default/max €/MWh) for the token's org. REGIE grids are capped by the effective ADMIN grid.",
    status: "live",
    readOnly: false,
    scopes: ["admin:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        roleScope: { type: "string", enum: [...ROLE_SCOPES], description: "Default ADMIN." },
        minMarginEurMwh: { type: "number" },
        defaultMarginEurMwh: { type: "number" },
        maxMarginEurMwh: { type: "number" },
        effectiveFrom: { type: "string" },
        effectiveTo: { type: "string" },
      },
      required: ["minMarginEurMwh", "defaultMarginEurMwh", "maxMarginEurMwh"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const grid = await ctx.marginGrids.create(ctx.actor, {
        organizationId: ctx.actor.orgId,
        roleScope: oneOf(value.roleScope, "roleScope", ROLE_SCOPES, false) ?? "ADMIN",
        minMarginEurMwh: num(value.minMarginEurMwh, "minMarginEurMwh", { min: 0, required: true })!,
        defaultMarginEurMwh: num(value.defaultMarginEurMwh, "defaultMarginEurMwh", { min: 0, required: true })!,
        maxMarginEurMwh: num(value.maxMarginEurMwh, "maxMarginEurMwh", { min: 0, required: true })!,
        effectiveFrom: isoDate(value.effectiveFrom, "effectiveFrom") ?? new Date().toISOString().slice(0, 10),
        effectiveTo: isoDate(value.effectiveTo, "effectiveTo"),
      });
      return { marginGrid: grid };
    },
  },
  {
    name: "pricing_parameters.create_version",
    description:
      "Publish a new pass-through pricing parameter set (CEE, capacity, accise, CTA, TVA, TURPE fixed + variable) — supersedes the previous ACTIVE version.",
    status: "live",
    readOnly: false,
    scopes: ["admin:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        ceeEurMwh: { type: "number" },
        capacityEurMwh: { type: "number" },
        acciseEurMwh: { type: "number" },
        ctaRate: { type: "number" },
        tvaRate: { type: "number" },
        turpeFixed: {
          type: "object",
          properties: {
            gestionCentsPerDay: { type: "number" },
            comptageCentsPerDay: { type: "number" },
            soutirageFixeCentsPerKwPerDay: { type: "number" },
          },
        },
        turpeVariable: {
          type: "object",
          properties: {
            HPH: { type: "number" },
            HCH: { type: "number" },
            HPE: { type: "number" },
            HCE: { type: "number" },
          },
        },
        effectiveFrom: { type: "string" },
        effectiveTo: { type: "string" },
      },
      required: ["ceeEurMwh", "capacityEurMwh", "acciseEurMwh", "ctaRate", "tvaRate", "turpeFixed", "turpeVariable"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const turpeFixed = obj(value.turpeFixed, "turpeFixed");
      const turpeVariableInput = obj(value.turpeVariable, "turpeVariable");
      const turpeVariable: TurpeVariableRates = {};
      for (const cadran of ["HPH", "HCH", "HPE", "HCE"] as SeasonalCadran[]) {
        turpeVariable[cadran] = num(turpeVariableInput[cadran], `turpeVariable.${cadran}`, { min: 0, required: true })!;
      }
      const current = await ctx.pricingParams.resolveEffective(ctx.actor);
      const params = await ctx.pricingParams.create(ctx.actor, {
        organizationId: ctx.actor.orgId,
        ceeEurMwh: num(value.ceeEurMwh, "ceeEurMwh", { min: 0, required: true })!,
        capacityEurMwh: num(value.capacityEurMwh, "capacityEurMwh", { min: 0, required: true })!,
        acciseEurMwh: num(value.acciseEurMwh, "acciseEurMwh", { min: 0, required: true })!,
        ctaRate: num(value.ctaRate, "ctaRate", { min: 0, max: 1, required: true })!,
        tvaRate: num(value.tvaRate, "tvaRate", { min: 0, max: 1, required: true })!,
        turpeFixed: {
          gestionCentsPerDay: num(turpeFixed.gestionCentsPerDay, "turpeFixed.gestionCentsPerDay", { min: 0, required: true })!,
          comptageCentsPerDay: num(turpeFixed.comptageCentsPerDay, "turpeFixed.comptageCentsPerDay", { min: 0, required: true })!,
          soutirageFixeCentsPerKwPerDay: num(turpeFixed.soutirageFixeCentsPerKwPerDay, "turpeFixed.soutirageFixeCentsPerKwPerDay", { min: 0, required: true })!,
        },
        turpeVariable,
        // Not editable here: carried over from the current version (Settings → Tarification).
        smallSiteRates: current?.smallSiteRates ?? null,
        consumptionProfile: current?.consumptionProfile ?? null,
        effectiveFrom: isoDate(value.effectiveFrom, "effectiveFrom") ?? new Date().toISOString().slice(0, 10),
        effectiveTo: isoDate(value.effectiveTo, "effectiveTo"),
      });
      return { pricingParameters: params };
    },
  },
  {
    name: "audit.search",
    description: "Search audit_events (operator + finance). Filters: action, resourceType, resourceId, organizationId, time range, limit.",
    status: "live",
    readOnly: true,
    scopes: ["audit:read"],
    roles: ADMIN_AND_FINANCE,
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string" },
        resourceType: { type: "string" },
        resourceId: { type: "string" },
        organizationId: { type: "string" },
        sinceSeconds: { type: "number", description: "unixepoch lower bound (inclusive)." },
        untilSeconds: { type: "number", description: "unixepoch upper bound (inclusive)." },
        limit: { type: "number", description: "Default 50, max 200." },
      },
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const clauses: string[] = [];
      const bindings: (string | number)[] = [];
      const action = str(value.action, "action", { max: 120 });
      const resourceType = str(value.resourceType, "resourceType", { max: 60 });
      const resourceId = str(value.resourceId, "resourceId", { max: 120 });
      const organizationId = str(value.organizationId, "organizationId", { max: 100 });
      const sinceSeconds = num(value.sinceSeconds, "sinceSeconds", { min: 0, integer: true });
      const untilSeconds = num(value.untilSeconds, "untilSeconds", { min: 0, integer: true });
      const limit = num(value.limit, "limit", { min: 1, max: 200, integer: true }) ?? 50;
      if (ctx.actor.role !== "SUPER_ADMIN") {
        // Finance tokens stay inside their own org (SUPER_ADMIN sees everything).
        clauses.push("organization_id = ?");
        bindings.push(ctx.actor.orgId);
      } else if (organizationId) {
        clauses.push("organization_id = ?");
        bindings.push(organizationId);
      }
      if (action) {
        clauses.push("action = ?");
        bindings.push(action);
      }
      if (resourceType) {
        clauses.push("resource_type = ?");
        bindings.push(resourceType);
      }
      if (resourceId) {
        clauses.push("resource_id = ?");
        bindings.push(resourceId);
      }
      if (sinceSeconds !== null) {
        clauses.push("created_at >= ?");
        bindings.push(sinceSeconds);
      }
      if (untilSeconds !== null) {
        clauses.push("created_at <= ?");
        bindings.push(untilSeconds);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await ctx.db
        .prepare(
          `SELECT id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at
           FROM audit_events ${where}
           ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(...bindings, limit)
        .all();
      return { events: result.results ?? [], count: (result.results ?? []).length };
    },
  },
  {
    name: "access.send_email",
    description:
      "(Re)send the Zack AI access email (sign-up link + instructions) to someone who already has a pending régie invitation or an active internal admin grant. Never creates access.",
    status: "live",
    readOnly: false,
    scopes: ["admin:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { email: { type: "string" } },
      required: ["email"],
    },
    run: async (ctx, args) => {
      const email = str(obj(args).email, "email", { required: true, max: 200 })!.trim().toLowerCase();
      const grant =
        (await ctx.db
          .prepare(
            `SELECT invitation.email, invitation.role, invitation.expires_at, organization.name AS organization_name
             FROM organization_invitations invitation
             JOIN organizations organization ON organization.id = invitation.organization_id
             WHERE lower(invitation.email) = ? AND invitation.status = 'PENDING' AND invitation.expires_at > unixepoch()
             ORDER BY invitation.created_at DESC LIMIT 1`,
          )
          .bind(email)
          .first<{ email: string; role: string; expires_at: number | null; organization_name: string }>()) ??
        (await ctx.db
          .prepare(
            `SELECT whitelist.email, whitelist.role, NULL AS expires_at, organization.name AS organization_name
             FROM internal_user_whitelist whitelist
             JOIN organizations organization ON organization.id = whitelist.organization_id
             WHERE lower(whitelist.email) = ? AND whitelist.status = 'ACTIVE' LIMIT 1`,
          )
          .bind(email)
          .first<{ email: string; role: string; expires_at: number | null; organization_name: string }>());
      if (!grant || !isAppRole(grant.role)) throw new CrmError("CRM_NOT_FOUND", 404, "email");
      const sent = await sendAccessEmail(
        {
          email: grant.email,
          role: grant.role,
          organizationName: grant.organization_name,
          inviterName: "L'équipe Zack AI",
          expiresAt: grant.expires_at,
        },
        ctx.env.EMAIL,
      );
      return { email: grant.email, role: grant.role, organization: grant.organization_name, sent };
    },
  },
];
