import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OrganizationManager } from "@/lib/access-management/organization-manager";

const api = new CrmApiManager();

export async function POST(request: Request) {
  try {
    const invitation = await new OrganizationManager().invite(await api.actor(), await api.json(request));
    return Response.json({ invitation }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
