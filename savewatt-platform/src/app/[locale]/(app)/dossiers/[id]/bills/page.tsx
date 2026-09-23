import { FilePdf, Scan } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/workspace/page-header";

export default async function BillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("dossier.bills");
  return <div className="rise"><PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} /><section className="mt-6 rounded-2xl border border-line bg-surface p-5"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><FilePdf size={21} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{t("currentBill")}</p><p className="mt-1 text-xs text-muted">{t("extractedReviewRequired")}</p></div><Link href={`/dossiers/${id}/bills/bill-current/validate`} className="press inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-xs font-medium text-ink"><Scan size={15} />{t("validate")}</Link></div></section></div>;
}
