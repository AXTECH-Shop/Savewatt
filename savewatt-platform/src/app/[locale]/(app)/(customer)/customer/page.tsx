import { ArrowRight, CheckCircle, FileText, Gift, Lightning, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CustomerBenefitChoice } from "@/components/gifting/customer-benefit-choice";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";
import { CustomerBenefitRepository } from "@/lib/gifting/customer-benefit-repository";
import { CustomerDashboardRepository } from "@/lib/customer/customer-dashboard-repository";
import { resolveServerActor } from "@/lib/server-access";
import type { DossierStatus } from "@/lib/types";

const STATUS_RANK: Record<DossierStatus, number> = {
  draft: 0,
  uploaded: 1,
  analyzed: 2,
  proposalReady: 3,
  sent: 4,
  signed: 5,
  lost: -1,
};

const timeline = [
  ["timelineBillReceived", "timelineBillReceivedDetail", 1],
  ["timelineComparisonPrepared", "timelineComparisonPreparedDetail", 2],
  ["timelineOfferToReview", "timelineOfferToReviewDetail", 4],
  ["timelineSignature", "timelineSignatureDetail", 5],
] as const;

export default async function CustomerDashboardPage() {
  const t = await getTranslations("customer");
  const statusT = await getTranslations("status");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const actor = await resolveServerActor();
  const [benefit, dashboard] = actor.isPreview
    ? [null, null]
    : await Promise.all([
        new CustomerBenefitRepository().getCurrentForUser(actor.userId),
        new CustomerDashboardRepository().getForUser(actor.userId),
      ]);
  const offer = dashboard?.offer ?? null;
  const rank = dashboard ? STATUS_RANK[dashboard.dossierStatus] ?? 0 : -1;
  const price = (value: number | null) => (value === null ? "—" : `${number.format(value)} €/MWh`);

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <MetricStrip items={[
        { label: t("estimatedSaving"), value: offer ? currency.format(offer.annualSaving) : "—", tone: "positive" },
        { label: t("proposedTerm"), value: offer ? t("termValue", { years: offer.termYears }) : "—" },
        { label: t("site"), value: dashboard?.clientName ?? "—" },
        { label: t("status"), value: dashboard ? statusT(dashboard.dossierStatus) : t("noDossier"), tone: "warning" },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-5 py-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-ink">{t("comparisonTitle")}</h2>{offer && <StatusPill tone="positive">{t("ready")}</StatusPill>}</div><p className="mt-1 text-sm text-muted">{offer ? t("comparisonDescription") : t("noOfferYet")}</p></div>
          {offer && <div className="grid gap-6 p-5 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{t("currentContract")}</p><p className="nums mt-3 text-2xl font-semibold text-ink">{price(offer.currentAvgEurMwh)}</p><p className="mt-1 text-sm text-muted">{t("weightedAverage")}</p></div><div className="border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{t("savewattProposal")}</p><p className="nums mt-3 text-2xl font-semibold text-accent">{price(offer.proposedAvgEurMwh)}</p><p className="mt-1 text-sm text-muted">{t("finalComparablePrice")}</p></div></div>}
          <div className="border-t border-line bg-surface-2 p-5"><Link href="/customer/documents" className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white">{t("reviewFullOffer")}<ArrowRight size={16} /></Link></div>
        </section>
        <aside className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">{t("progress")}</p><ol className="mt-5 space-y-5">{timeline.map(([label, detail, minRank], index) => { const done = rank >= minRank; return <li key={label} className="relative flex gap-3">{index < timeline.length - 1 && <span className="absolute left-[0.7rem] top-6 h-[calc(100%+0.25rem)] w-px bg-white/15" />}<span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-lime text-deep" : "border border-white/35 text-white/45"}`}>{done ? <CheckCircle size={15} weight="fill" /> : index + 1}</span><span><strong className="block text-sm">{t(label)}</strong><span className="mt-1 block text-xs leading-5 text-white/65">{t(detail)}</span></span></li>; })}</ol></aside>
      </div>
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Gift size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">{t("benefitTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {t("benefitDescription")}
            </p>
          </div>
        </div>
        {benefit ? (
          <CustomerBenefitChoice
            dossierId={benefit.dossierId}
            initialBenefitType={benefit.benefitType}
          />
        ) : (
          <p className="mt-4 text-sm text-muted">
            {t("benefitUnavailable")}
          </p>
        )}
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-3"><InfoCard icon={<Lightning size={20} />} title={t("explainedPrices")} description={t("explainedPricesDescription")} /><InfoCard icon={<FileText size={20} />} title={t("centralisedDocuments")} description={t("centralisedDocumentsDescription")} /><InfoCard icon={<SealCheck size={20} />} title={t("secureSignature")} description={t("secureSignatureDescription")} /></section>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <article className="rounded-2xl border border-line bg-surface p-5"><span className="text-accent">{icon}</span><h2 className="mt-4 font-semibold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p></article>;
}
