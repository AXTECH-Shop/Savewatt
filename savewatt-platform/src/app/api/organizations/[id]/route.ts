import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OrganizationManager } from "@/lib/access-management/organization-manager";

const api = new CrmApiManager();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const organization = await new OrganizationManager().update(await api.actor(), id, await api.json(request));
    return Response.json({ organization });
  } catch (error) {
    return api.error(error);
  }
}
