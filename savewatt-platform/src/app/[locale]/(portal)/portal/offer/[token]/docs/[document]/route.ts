import { isPortalDocumentKind, loadPortalDocument } from "@/lib/portal/portal-offer-loader";

export const runtime = "nodejs";

/**
 * Streams the archived offer PDFs (budget prévisionnel / marketing one-pager)
 * from the private R2 DOCUMENTS binding for a valid portal token. The bucket
 * stays private: no public R2 URL ever reaches the client, and any token or
 * content problem is answered with a bare 404 (no information leak).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; document: string }> },
) {
  const { token, document } = await params;
  if (!isPortalDocumentKind(document)) {
    return new Response(null, { status: 404 });
  }
  const pdf = await loadPortalDocument(token, document);
  if (!pdf) {
    return new Response(null, { status: 404 });
  }
  return new Response(pdf.bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${pdf.fileName}"`,
      "cache-control": "private, no-store",
    },
  });
}
