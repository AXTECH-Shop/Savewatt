import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { NotificationRepository } from "@/lib/notifications/notification-repository";

export const runtime = "nodejs";

const api = new CrmApiManager();

interface MarkReadBody {
  id?: unknown;
  all?: unknown;
}

export async function POST(request: Request) {
  try {
    const actor = await api.actor();
    const body = (await api.json(request)) as MarkReadBody;
    const repository = new NotificationRepository();

    if (body.all === true) {
      const updated = await repository.markAllRead(actor.userId);
      return NextResponse.json({ updated });
    }

    if (typeof body.id !== "string" || body.id.length < 8) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "id");
    }
    const updated = await repository.markRead(actor.userId, body.id);
    return NextResponse.json({ updated: updated ? 1 : 0 });
  } catch (error) {
    return api.error(error);
  }
}
