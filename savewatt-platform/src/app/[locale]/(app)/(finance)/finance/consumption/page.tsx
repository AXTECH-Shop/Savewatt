import { FileCsv, LockKey } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { Button } from "@/components/ui/button";

export default async function ConsumptionImportPage() {
  const t = await getTranslations("finance");

  return <div className="rise"><PageHeader eyebrow={t("finance")} title={t("consumptionImport")} description={t("consumptionImportDescription")} /><section className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileCsv size={24} /></span><h2 className="mt-4 text-base font-semibold text-ink">{t("dropSupplierFile")}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("supplierFileDescription")}</p><Button className="mt-5" disabled>{t("chooseFile")}</Button><p className="mt-4 inline-flex items-center gap-1 text-xs text-faint"><LockKey size={14} />{t("importDisabled")}</p></section></div>;
}
