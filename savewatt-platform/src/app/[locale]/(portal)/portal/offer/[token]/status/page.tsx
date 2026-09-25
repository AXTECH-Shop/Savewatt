import { ArrowLeft, ClockCountdown, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { PortalOfferState } from "@/components/portal/portal-offer-state";
import { Link } from "@/i18n/navigation";
import { resolvePortalOffer } from "@/lib/portal/portal-offer-loader";

export default async function PortalStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolution = await resolvePortalOffer(token);
  if (resolution.kind !== "ready") return <PortalOfferState state={resolution} />;
  const { offer } = resolution;

  const locale = await getLocale();
  const t = await getTranslations("portal.status");
  const dateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="rise mx-auto max-w-xl">
      <Link
        href={`/portal/offer/${token}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> {t("backToOffer")}
      </Link>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <PaperPlaneTilt size={24} />
        </span>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-accent">
          {t("deliveryEyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
          {t("deliveryTitle")}
        </h1>
        <dl className="mt-5 grid gap-4">
          {offer.sentAt ? (
            <Row label={t("sentAtLabel")} value={dateTime.format(offer.sentAt * 1000)} />
          ) : null}
          <Row label={t("recipientLabel")} value={offer.recipientEmail} />
          {offer.validUntil ? (
            <Row
              label={t("validUntilLabel")}
              value={dateTime.format(new Date(offer.validUntil))}
            />
          ) : null}
          <Row
            label={t("viewedLabel")}
            value={
              offer.viewedAt ? dateTime.format(offer.viewedAt * 1000) : t("notViewedValue")
            }
          />
        </dl>
      </section>

      <section className="mt-5 py-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
          <ClockCountdown size={27} />
        </span>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-warning">
          {t("pendingEyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-ink">
          {t("pendingTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">{t("pendingBody")}</p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="text-right font-mono text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
