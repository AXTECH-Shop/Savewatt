import { AccessAdminManager } from "@/lib/access-management/access-admin-manager";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";

const api = new CrmApiManager();

export async function GET() {
  try {
    return Response.json(await new AccessAdminManager().snapshot(await api.actor()));
  } catch (error) {
    return api.error(error);
  }
}
