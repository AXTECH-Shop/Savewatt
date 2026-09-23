import "server-only";

import { NextResponse } from "next/server";
import type { WorkspaceActor } from "@/lib/access-control";
import {
  resolveServerActor,
  WorkspaceAccessError,
} from "@/lib/server-access";
import { CrmError } from "./crm-errors";

export class CrmApiManager {
  async actor(): Promise<WorkspaceActor> {
    const actor = await resolveServerActor();
    if (actor.isPreview) throw new CrmError("CRM_UNAVAILABLE", 503);
    return actor;
  }

  async json(request: Request): Promise<unknown> {
    try {
      return await request.json();
    } catch {
      throw new CrmError("CRM_INVALID_INPUT", 400, "body");
    }
  }

  error(error: unknown): NextResponse {
    if (error instanceof CrmError) {
      return NextResponse.json(
        { error: error.code, ...(error.field ? { field: error.field } : {}) },
        { status: error.status },
      );
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("CRM_API_FAILURE", error);
    return NextResponse.json({ error: "CRM_INTERNAL_ERROR" }, { status: 500 });
  }
}
