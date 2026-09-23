import { AccessAdminManager } from "@/lib/access-management/access-admin-manager";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";

const api = new CrmApiManager();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await new AccessAdminManager().decide(await api.actor(), id, await api.json(request));
    return Response.json({ ok: true });
  } catch (error) {
    return api.error(error);
  }
}
