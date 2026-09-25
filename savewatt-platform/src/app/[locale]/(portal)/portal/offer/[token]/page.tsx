import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { PortalOfferState } from "@/components/portal/portal-offer-state";
import { Link } from "@/i18n/navigation";
import { resolvePortalOffer } from "@/lib/portal/portal-offer-loader";

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolution = await resolvePortalOffer(token);
  if (resolution.kind !== "ready") return <PortalOfferState state={resolution} />;
  const { offer } = resolution;

  const locale = await getLocale();
  const t = await getTranslations("portal.offer");
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const price = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const years = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "year",
    unitDisplay: "long",
  });

  return (
    <div className="rise">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-muted">{t("subtitle")}</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_18rem]">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">{t("summaryTitle")}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Metric
              label={t("annualSaving")}
              value={t("taxExclusiveAmount", {
                amount: currency.format(offer.annualSavingEur),
              })}
            />
            <Metric label={t("term")} value={years.format(offer.termYears)} />
            <Metric
              label={t("termSaving")}
              value={t("taxExclusiveAmount", {
                amount: currency.format(offer.termSavingEur),
              })}
            />
            {offer.validUntil ? (
              <Metric
                label={t("validUntilLabel")}
                value={date.format(new Date(offer.validUntil))}
              />
            ) : null}
            {offer.pdl ? <Metric label={t("deliveryPoint")} value={offer.pdl} /> : null}
            <Metric label={t("supplierLabel")} value={offer.supplierName} />
          </dl>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-xs leading-5 text-accent-ink">
            <CheckCircle size={17} weight="fill" />
            {t("internalMarginNotice")}
          </div>
        </section>
        <aside className="rounded-2xl bg-deep p-6 text-white">
          <p className="text-sm font-semibold">{t("continueTitle")}</p>
          <p className="mt-2 text-xs leading-5 text-white/65">{t("continueBody")}</p>
          <Link
            href={`/portal/offer/${token}/docs`}
            className="press mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 text-sm font-semibold text-deep"
          >
            {t("continueCta")} <ArrowRight size={16} />
          </Link>
        </aside>
      </div>

      <section className="mt-5 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">{t("pricesTitle")}</h2>
        <p className="mt-1 text-xs leading-5 text-faint">{t("pricesSubtitle")}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offer.priceLines.map((line) => (
            <Metric
              key={line.cadran}
              label={line.cadran}
              value={t("pricePerMwh", { price: price.format(line.priceEurMwh) })}
            />
          ))}
        </dl>
      </section>

      {offer.budget ? (
        <section className="mt-5 rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">{t("budgetTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-faint">{t("budgetSubtitle")}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric
              label={t("budgetTtcLabel")}
              value={t("perYear", { amount: currency.format(offer.budget.totalTtcEur) })}
            />
            <Metric
              label={t("budgetHtLabel")}
              value={t("perYear", { amount: currency.format(offer.budget.totalHtEur) })}
            />
            <Metric
              label={t("budgetTermLabel")}
              value={currency.format(offer.budget.termTotalTtcEur)}
            />
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 font-mono text-base font-semibold text-ink">{value}</dd>
    </div>
  );
}
