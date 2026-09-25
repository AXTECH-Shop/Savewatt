import { ArrowSquareOut, ChartBar, FilePdf, PenNib, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { StatusPill } from "@/components/workspace/status-pill";

const templates = [
  { key: "offerMarketing", preview: "offer-marketing", icon: FilePdf },
  { key: "offerBudget", preview: "offer-budget", icon: ChartBar },
  { key: "supplyContract", preview: null, icon: PenNib },
  { key: "signatureCertificate", preview: null, icon: SealCheck },
] as const;

export default async function TemplateSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  const t = await getTranslations("documentTemplates");
  const locale = await getLocale();

  return (
    <div className="rise">
      <SettingsNav />
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {templates.map(({ key, preview, icon: Icon }) => (
          <article key={key} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon size={20} />
              </span>
              <StatusPill tone={preview ? "positive" : "neutral"}>{t(preview ? "active" : "inactive")}</StatusPill>
            </div>
            <h2 className="mt-5 text-base font-semibold text-ink">{t(`${key}.title`)}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{t(`${key}.description`)}</p>
            {preview ? (
              <a
                href={`/api/settings/templates/${preview}?locale=${locale}`}
                target="_blank"
                rel="noopener"
                className="press mt-5 inline-flex items-center gap-1.5 self-start text-sm font-medium text-accent"
              >
                {t("preview")}
                <ArrowSquareOut size={15} />
              </a>
            ) : (
              <p className="mt-5 text-xs text-faint">{t("inactiveHint")}</p>
            )}
          </article>
        ))}
      </section>
      <p className="mt-4 text-xs text-muted">{t("sampleNote")}</p>
    </div>
  );
}
