import { ArrowRight, FilePlus } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { demoActionKeys, demoCopyKey } from "@/lib/demo-copy";
import { demoCommissionLines, demoDeals } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default async function PortfolioPage() {
  const t = await getTranslations("portfolio");
  const workspaceT = await getTranslations("workspace");
  const locale = await getLocale();
  const open = demoDeals.filter(
    (deal) => !["signed", "lost"].includes(deal.status),
  );
  const commissions = demoCommissionLines.reduce(
    (sum, line) => sum + line.amountEur,
    0,
  );
  const wholeCurrency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
  return (
    <div className="rise">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          <Link
            href="/new"
            className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"
          >
            <FilePlus size={17} /> {t("newFile")}
          </Link>
        }
      />
      <MetricStrip
        items={[
          {
            label: t("openFiles"),
            value: String(open.length),
            detail: t("onBranch"),
          },
          {
            label: t("signing"),
            value: String(
              demoDeals.filter((deal) => deal.status === "sent").length,
            ),
          },
          {
            label: t("proposedSaving"),
            value: wholeCurrency.format(
              demoDeals.reduce((sum, deal) => sum + deal.annualSavingEur, 0),
            ),
            tone: "positive",
          },
          {
            label: t("trackedCommissions"),
            value: currency.format(commissions),
          },
        ]}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-semibold text-ink">{t("filesToAdvance")}</h2>
              <p className="mt-1 text-xs text-muted">
                {t("sortedByNextAction")}
              </p>
            </div>
            <Link href="/pipeline" className="text-sm font-medium text-accent">
              {t("viewPipeline")}
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {open.slice(0, 5).map((deal) => (
              <li key={deal.id}>
                <Link
                  href={`/clients/${deal.id}`}
                  className="press grid gap-3 px-5 py-4 hover:bg-surface-2 sm:grid-cols-[1fr_0.85fr_0.8fr_auto] sm:items-center"
                >
                  <span>
                    <strong className="block text-sm text-ink">
                      {deal.client}
                    </strong>
                    <span className="font-mono text-xs text-muted">
                      {deal.pdl}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {workspaceT(
                      demoCopyKey(demoActionKeys, deal.nextAction) ??
                        "unknownAction",
                    )}
                  </span>
                  <span className="text-sm text-muted">{deal.owner}</span>
                  <ArrowRight size={17} className="text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <aside className="space-y-6">
          <section className="rounded-2xl bg-deep p-5 text-white">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
              {t("nextDeadline")}
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              {t("contractsToAnticipate")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/68">
              {t("prepareRenewals")}
            </p>
            <Link
              href="/echeancier"
              className="mt-5 inline-flex text-sm font-semibold text-lime"
            >
              {t("viewSchedule")} <ArrowRight className="ml-2" size={16} />
            </Link>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">
                {t("availableCommission")}
              </h2>
              <StatusPill tone="positive">{t("validated")}</StatusPill>
            </div>
            <p className="nums mt-4 text-3xl font-semibold tracking-tight text-ink">
              {currency.format(123.08)}
            </p>
            <p className="mt-2 text-sm text-muted">{t("commissionDetail")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
