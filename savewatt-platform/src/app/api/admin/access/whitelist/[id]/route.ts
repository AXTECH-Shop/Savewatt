import { AccessAdminManager } from "@/lib/access-management/access-admin-manager";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";

const api = new CrmApiManager();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await new AccessAdminManager().revokeWhitelist(await api.actor(), id);
    return Response.json({ ok: true });
  } catch (error) {
    return api.error(error);
  }
}
