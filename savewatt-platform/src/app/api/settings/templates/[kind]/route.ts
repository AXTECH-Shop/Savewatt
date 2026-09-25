import { NextResponse } from "next/server";
import { CrmApiManager } from "@/lib/crm/crm-api-manager";
import { CrmError } from "@/lib/crm/crm-errors";
import { renderOfferBudgetHtml, renderOfferMarketingHtml } from "@/lib/offers/offer-pdf";
import { buildSampleOfferVersion, sampleOfferMeta } from "@/lib/offers/offer-template-sample";

export const runtime = "nodejs";

const api = new CrmApiManager();
const TEMPLATE_EDITORS = new Set(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);

/** Previews a customer document template rendered with an illustrative offer. */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const actor = await api.actor();
    if (!TEMPLATE_EDITORS.has(actor.role)) throw new CrmError("CRM_FORBIDDEN", 403);
    const { kind } = await params;
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
    const version = buildSampleOfferVersion();
    const meta = sampleOfferMeta(locale);
    let html: string;
    if (kind === "offer-marketing") html = renderOfferMarketingHtml(version, meta, locale);
    else if (kind === "offer-budget") html = renderOfferBudgetHtml(version, meta, locale);
    else throw new CrmError("CRM_NOT_FOUND", 404);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return api.error(error);
  }
}
