import { ArrowDown, CheckCircle, Clock, FileText, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";
import { Button } from "@/components/ui/button";

const steps = [
  ["qualification", "qualificationRule", "24 h", FileText],
  ["offerValidation", "offerValidationRule", "8 h", CheckCircle],
  ["signature", "signatureRule", "72 h", PaperPlaneTilt],
] as const;

export default async function WorkflowSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const t = await getTranslations("settings");

  return <div className="rise"><SettingsNav /><PageHeader eyebrow={t("settings")} title={t("commercialWorkflow")} description={t("commercialWorkflowDescription")} action={<Button disabled>{t("newVersion")}</Button>} /><ConfigurationNote>{t("workflowConfigurationNote")}</ConfigurationNote><section className="rounded-2xl border border-line bg-surface p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="font-semibold text-ink">{t("b2bElectricityJourney")}</p><p className="mt-1 text-xs text-muted">{t("versionDraft")}</p></div><span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">{t("unpublished")}</span></div><ol className="space-y-2">{steps.map(([name, rule, sla, Icon], index) => <li key={name}><div className="grid gap-3 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span><div><p className="text-sm font-semibold text-ink">{index + 1}. {t(name)}</p><p className="mt-0.5 text-xs text-muted">{t(rule)}</p></div><span className="inline-flex items-center gap-1 font-mono text-xs text-faint"><Clock size={14} />SLA {sla}</span></div>{index < steps.length - 1 && <ArrowDown size={16} className="mx-auto my-1 text-faint" />}</li>)}</ol></section></div>;
}
