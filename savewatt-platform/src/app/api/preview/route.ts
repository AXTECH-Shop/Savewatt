import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { listPreviewTargets, ROLE_PREVIEW_COOKIE } from "@/lib/access/role-preview";
import { resolveServerActor } from "@/lib/server-access";

const api = new CrmApiManager();

/** Starts (organizationId) or stops (null) a read-only super-admin preview of an organization. */
export async function POST(request: Request) {
  try {
    const actor = await resolveServerActor({ ignorePreview: true });
    if (actor.role !== "SUPER_ADMIN") throw new CrmError("CRM_FORBIDDEN", 403);
    const body = (await api.json(request)) as { organizationId?: unknown };
    const response = NextResponse.json({ ok: true });
    if (body.organizationId === null || body.organizationId === undefined || body.organizationId === "") {
      response.cookies.delete(ROLE_PREVIEW_COOKIE);
      return response;
    }
    const targets = await listPreviewTargets();
    if (typeof body.organizationId !== "string" || !targets.some((target) => target.id === body.organizationId)) {
      throw new CrmError("CRM_NOT_FOUND", 404, "organizationId");
    }
    response.cookies.set(ROLE_PREVIEW_COOKIE, body.organizationId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch (error) {
    return api.error(error);
  }
}
