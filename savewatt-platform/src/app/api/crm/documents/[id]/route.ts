import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { DocumentManager } from "@/lib/documents/document-manager";

export const runtime = "nodejs";

const api = new CrmApiManager();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await api.actor();
    const { id } = await params;
    const { document, object } = await new DocumentManager().open(actor, id);
    const encodedName = encodeURIComponent(document.fileName);
    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(document.byteSize),
        "Content-Type": document.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return api.error(error);
  }
}
