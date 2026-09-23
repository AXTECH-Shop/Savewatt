import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();
  const t = await getTranslations("portal.offer");
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const years = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "year",
    unitDisplay: "long",
  });
  const hours = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "hour",
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
      <p className="mt-3 max-w-xl text-base leading-7 text-muted">
        {t("subtitle")}
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_18rem]">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">
            {t("summaryTitle")}
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Metric
              label={t("annualSaving")}
              value={t("taxExclusiveAmount", {
                amount: currency.format(2511),
              })}
            />
            <Metric label={t("term")} value={years.format(3)} />
            <Metric
              label={t("validity", { date: "" }).trim()}
              value={hours.format(48)}
            />
            <Metric label={t("deliveryPoint")} value="50066947359734" />
          </dl>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-xs leading-5 text-accent-ink">
            <CheckCircle size={17} weight="fill" />
            {t("internalMarginNotice")}
          </div>
        </section>
        <aside className="rounded-2xl bg-deep p-6 text-white">
          <p className="text-sm font-semibold">{t("continueTitle")}</p>
          <p className="mt-2 text-xs leading-5 text-white/65">
            {t("continueBody")}
          </p>
          <Link
            href={`/portal/offer/${token}/sign`}
            className="press mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 text-sm font-semibold text-deep"
          >
            {t("continueCta")} <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 font-mono text-base font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}
