import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const parameters = [
  ["excise", 20.5, "currency", "2026-02-01"],
  ["cta", 21.93, "percent", "2026-08-01"],
  ["energyVat", 20, "percent", "2026-01-01"],
  ["turpe7", null, "version", "2025-08-01"],
] as const;

export default async function RegulatoryPage() {
  const t = await getTranslations("operator");
  const locale = await getLocale();
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
  const percent = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale);

  return <div className="rise"><PageHeader eyebrow={t("operator")} title={t("regulatorySettings")} description={t("regulatorySettingsDescription")} /><section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><table className="w-full text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint"><tr><th className="px-5 py-3 text-left">{t("parameter")}</th><th className="px-5 py-3 text-left">{t("value")}</th><th className="px-5 py-3 text-left">{t("effectiveDate")}</th><th className="px-5 py-3 text-right">{t("state")}</th></tr></thead><tbody className="divide-y divide-line">{parameters.map(([name, value, format, effectiveDate]) => <tr key={name}><td className="px-5 py-4 font-medium text-ink">{t(name)}</td><td className="px-5 py-4 font-mono text-muted">{format === "currency" ? `${currency.format(value ?? 0)}/MWh` : format === "percent" ? percent.format((value ?? 0) / 100) : t("turpeVersion")}</td><td className="px-5 py-4 text-muted">{date.format(new Date(`${effectiveDate}T00:00:00Z`))}</td><td className="px-5 py-4 text-right"><StatusPill tone="positive">{t("active")}</StatusPill></td></tr>)}</tbody></table></section></div>;
}
