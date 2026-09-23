import { DownloadSimple, FileCsv, TrendUp } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";

const exportTypes: Array<{ name: string; detail: string; icon: Icon }> = [
  { name: "accountingEntries", detail: "accountingEntriesDetail", icon: FileCsv },
  { name: "cashForecast", detail: "cashForecastDetail", icon: TrendUp },
  { name: "commissionDetail", detail: "commissionDetailDescription", icon: DownloadSimple },
];

export default async function FinanceExportsPage() {
  const t = await getTranslations("finance");

  return <div className="rise"><PageHeader eyebrow={t("finance")} title={t("accountingExports")} description={t("accountingExportsDescription")} /><section className="mt-6 grid gap-4 lg:grid-cols-3">{exportTypes.map(({ name, detail, icon: Icon }) => <article key={name} className="rounded-2xl border border-line bg-surface p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted"><Icon size={20} /></span><h2 className="mt-4 text-sm font-semibold text-ink">{t(name)}</h2><p className="mt-1 text-xs text-muted">{t(detail)}</p><button disabled className="mt-5 text-xs font-medium text-faint">{t("availableAfterClose")}</button></article>)}</section></div>;
}
