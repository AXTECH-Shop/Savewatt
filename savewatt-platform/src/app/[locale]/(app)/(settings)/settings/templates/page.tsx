import { FilePdf, PenNib, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { StatusPill } from "@/components/workspace/status-pill";

const templates = [
  ["commercialOffer", "commercialOfferDescription", "active", FilePdf],
  ["supplyContract", "supplyContractDescription", "toConfigure", PenNib],
  ["signatureCertificate", "signatureCertificateDescription", "automatic", SealCheck],
] as const;

export default async function TemplateSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const t = await getTranslations("settings");

  return <div className="rise"><SettingsNav /><PageHeader eyebrow={t("settings")} title={t("documentTemplates")} description={t("documentTemplatesDescription")} /><section className="mt-6 grid gap-4 lg:grid-cols-3">{templates.map(([name, detail, state, Icon]) => <article key={name} className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span><StatusPill tone={state === "toConfigure" ? "warning" : "positive"}>{t(state)}</StatusPill></div><h2 className="mt-5 text-base font-semibold text-ink">{t(name)}</h2><p className="mt-1 text-sm text-muted">{t(detail)}</p><button className="press mt-5 text-sm font-medium text-accent">{t("openTemplate")}</button></article>)}</section></div>;
}
