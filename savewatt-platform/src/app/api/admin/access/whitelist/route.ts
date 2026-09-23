import { AccessAdminManager } from "@/lib/access-management/access-admin-manager";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";

const api = new CrmApiManager();

export async function POST(request: Request) {
  try {
    const whitelistEntry = await new AccessAdminManager().addWhitelist(await api.actor(), await api.json(request));
    return Response.json({ whitelistEntry }, { status: 201 });
  } catch (error) {
    return api.error(error);
  }
}
