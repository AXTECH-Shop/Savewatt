import { getTranslations } from "next-intl/server";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";
import { Button } from "@/components/ui/button";

const rows = [["BASE", "4.00", "18.00"], ["HPH", "5.00", "20.00"], ["HCH", "4.00", "18.00"], ["HPE", "3.00", "16.00"], ["HCE", "3.00", "16.00"]] as const;

export default async function MarginSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const t = await getTranslations("settings");

  return <div className="rise"><SettingsNav /><PageHeader eyebrow={t("settings")} title={t("marginGrid")} description={t("marginGridDescription")} action={<Button disabled>{t("createGrid")}</Button>} /><ConfigurationNote>{t("marginConfigurationNote")}</ConfigurationNote><section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><p className="text-sm font-semibold text-ink">{t("metropolitanFranceGrid")}</p><p className="mt-1 text-xs text-muted">{t("applicableFrom")}</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint"><tr><th className="px-5 py-3 text-left">{t("timeBand")}</th><th className="px-5 py-3 text-right">{t("minimumPerMwh")}</th><th className="px-5 py-3 text-right">{t("maximumPerMwh")}</th><th className="px-5 py-3 text-right">{t("validation")}</th></tr></thead><tbody className="divide-y divide-line">{rows.map(([band, min, max]) => <tr key={band}><td className="px-5 py-3 font-mono font-semibold text-ink">{band}</td><td className="px-5 py-3 text-right font-mono text-muted">{min}</td><td className="px-5 py-3 text-right font-mono text-muted">{max}</td><td className="px-5 py-3 text-right text-xs text-accent">{t("automaticInGrid")}</td></tr>)}</tbody></table></div></section></div>;
}
