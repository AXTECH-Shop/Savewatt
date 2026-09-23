import { FileText, LockKey } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PortalDocumentsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("portal.docs");
  return <div className="rise mx-auto max-w-2xl"><p className="font-mono text-[11px] uppercase tracking-wider text-accent">{t("additionalEyebrow")}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("requestedTitle")}</h1><p className="mt-2 text-sm text-muted">{t("noAdditionalDocuments")}</p><section className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center"><FileText size={32} className="mx-auto text-accent" /><p className="mt-3 text-sm font-semibold text-ink">{t("emptyTitle")}</p><p className="mt-2 inline-flex items-center gap-1 text-xs text-faint"><LockKey size={14} />{t("securityNote")}</p><Link href={`/portal/offer/${token}/sign`} className="press mt-5 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-medium text-white">{t("signCta")}</Link></section></div>;
}
