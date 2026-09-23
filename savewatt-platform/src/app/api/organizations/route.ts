import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { OrganizationManager } from "@/lib/access-management/organization-manager";

const api = new CrmApiManager();

export async function GET() {
  try {
    return Response.json({ organizations: await new OrganizationManager().list(await api.actor()) });
  } catch (error) {
    return api.error(error);
  }
}

export async function POST(request: Request) {
  try {
    const organization = await new OrganizationManager().create(await api.actor(), await api.json(request));
    return Response.json({ organization }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
