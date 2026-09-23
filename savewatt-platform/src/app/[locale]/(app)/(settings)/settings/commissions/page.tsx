import { getTranslations } from "next-intl/server";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { Button } from "@/components/ui/button";

const tiers = [
  ["tierAxTech", "33% M", "tierAxTechDescription"],
  ["tierMasterRegie", "33% M", "tierMasterRegieDescription"],
  ["tierSubRegie", "configurable", "tierSubRegieDescription"],
  ["tierTeamReferrer", "configurable", "tierTeamReferrerDescription"],
] as const;

export default async function CommissionSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const t = await getTranslations("settings");

  return <div className="rise"><SettingsNav /><PageHeader eyebrow={t("settings")} title={t("commissionCascade")} description={t("commissionCascadeDescription")} action={<Button disabled>{t("editGrid")}</Button>} /><MetricStrip items={[{ label: t("networkShare"), value: "66% M", tone: "positive" }, { label: "AX TECH", value: "50%" }, { label: t("masterRegie"), value: "50%" }]} /><div className="mt-5"><ConfigurationNote>{t("commissionConfigurationNote")}</ConfigurationNote></div><section className="overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">{tiers.map(([name, share, note], index) => <li key={name} className="grid gap-2 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-deep font-mono text-xs font-bold text-lime">{index + 1}</span><div><p className="text-sm font-semibold text-ink">{t(name)}</p><p className="text-xs text-muted">{t(note)}</p></div><span className="font-mono text-sm font-semibold text-ink">{share}</span></li>)}</ul></section></div>;
}
