import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OrganizationManager } from "@/lib/access-management/organization-manager";

const api = new CrmApiManager();

export async function GET() {
  try {
    return Response.json(await new OrganizationManager().accessSnapshot(await api.actor()));
  } catch (error) {
    return api.error(error);
  }
}
