import { ClockCountdown } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

export default async function PortalStatusPage() {
  const t = await getTranslations("portal.status");
  return <div className="rise mx-auto max-w-xl py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning"><ClockCountdown size={27} /></span><p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-warning">{t("pendingEyebrow")}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("pendingTitle")}</h1><p className="mt-3 text-sm leading-6 text-muted">{t("pendingBody")}</p></div>;
}
