import { LockKey, PenNib } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PortalSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("portal.sign");
  return <div className="rise mx-auto max-w-3xl"><p className="font-mono text-[11px] uppercase tracking-wider text-accent">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1><section className="mt-6 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-8 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent"><PenNib size={26} /></span><h2 className="mt-4 text-base font-semibold text-ink">{t("formTitle")}</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">{t("formDescription")}</p><p className="mt-4 inline-flex items-center gap-1 text-xs text-faint"><LockKey size={14} />{t("securityNote")}</p><Link href={`/portal/offer/${token}/status`} className="mt-6 text-sm font-medium text-accent">{t("statusCta")}</Link></section></div>;
}
