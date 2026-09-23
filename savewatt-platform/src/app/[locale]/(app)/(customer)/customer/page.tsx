import { ArrowRight, CheckCircle, FileText, Gift, Lightning, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CustomerBenefitChoice } from "@/components/gifting/customer-benefit-choice";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";
import { CustomerBenefitRepository } from "@/lib/gifting/customer-benefit-repository";
import { resolveServerActor } from "@/lib/server-access";

const timeline = [
  ["timelineBillReceived", "timelineBillReceivedDetail", true],
  ["timelineComparisonPrepared", "timelineComparisonPreparedDetail", true],
  ["timelineOfferToReview", "timelineOfferToReviewDetail", false],
  ["timelineSignature", "timelineSignatureDetail", false],
] as const;

export default async function CustomerDashboardPage() {
  const t = await getTranslations("customer");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const actor = await resolveServerActor();
  const benefit = await new CustomerBenefitRepository().getCurrentForUser(actor.userId);

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <MetricStrip items={[
        { label: t("estimatedSaving"), value: t("estimatedSavingValue"), tone: "positive" },
        { label: t("proposedTerm"), value: t("proposedTermValue") },
        { label: t("site"), value: "Paris 18e" },
        { label: t("status"), value: t("offerToReview"), tone: "warning" },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-5 py-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-ink">{t("comparisonTitle")}</h2><StatusPill tone="positive">{t("ready")}</StatusPill></div><p className="mt-1 text-sm text-muted">{t("comparisonDescription")}</p></div>
          <div className="grid gap-6 p-5 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{t("currentContract")}</p><p className="nums mt-3 text-2xl font-semibold text-ink">{number.format(190.95)} €/MWh</p><p className="mt-1 text-sm text-muted">{t("summerPeakHours")}</p></div><div className="border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{t("savewattProposal")}</p><p className="nums mt-3 text-2xl font-semibold text-accent">{number.format(92.77)} €/MWh</p><p className="mt-1 text-sm text-muted">{t("finalComparablePrice")}</p></div></div>
          <div className="border-t border-line bg-surface-2 p-5"><Link href="/dossiers/josh-sample/proposal" className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white">{t("reviewFullOffer")}<ArrowRight size={16} /></Link></div>
        </section>
        <aside className="rounded-2xl bg-deep p-5 text-white"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">{t("progress")}</p><ol className="mt-5 space-y-5">{timeline.map(([label, detail, done], index) => <li key={label} className="relative flex gap-3">{index < timeline.length - 1 && <span className="absolute left-[0.7rem] top-6 h-[calc(100%+0.25rem)] w-px bg-white/15" />}<span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-lime text-deep" : "border border-white/35 text-white/45"}`}>{done ? <CheckCircle size={15} weight="fill" /> : index + 1}</span><span><strong className="block text-sm">{t(label)}</strong><span className="mt-1 block text-xs leading-5 text-white/65">{t(detail)}</span></span></li>)}</ol></aside>
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
