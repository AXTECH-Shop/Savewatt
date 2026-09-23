import { Gift, LockKey, Wallet } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";
import { GiftRedemptionRepository } from "@/lib/gifting/gift-redemption-repository";
import { resolveServerActor } from "@/lib/server-access";

const REASON_KEYS = {
  PARTNER_REFERRAL: "reasons.partnerReferral",
  PERFORMANCE_BONUS: "reasons.performanceBonus",
  CUSTOMER_CHOICE: "reasons.customerChoice",
  MANUAL_ADJUSTMENT: "reasons.manualAdjustment",
} as const;

const STATUS_KEYS = {
  PENDING: "status.pending",
  ISSUED: "status.issued",
  DELIVERED: "status.delivered",
  BOUNCED: "status.bounced",
  FAILED: "status.failed",
  REFUNDED: "status.refunded",
} as const;

export default async function WalletPage() {
  const t = await getTranslations("seller.wallet");
  const locale = await getLocale();
  const actor = await resolveServerActor();
  const repository = new GiftRedemptionRepository();
  const [summary, rewards] = await Promise.all([
    repository.getPartnerWalletSummary(actor.userId),
    repository.listForRecipient(actor.userId),
  ]);
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const date = new Intl.DateTimeFormat(locale);

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <MetricStrip items={[
        { label: t("availableCommissions"), value: currency.format(summary.availableBalanceCents / 100), tone: "positive" },
        { label: t("receivedRewards"), value: currency.format(summary.issuedRewardCents / 100) },
        { label: t("awards"), value: String(summary.rewardCount) },
        { label: t("issuer"), value: "SaveWatt" },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section>
          <h2 className="font-semibold text-ink">{t("awardedRewards")}</h2>
          <article className="mt-4 max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Gift size={22} />
            </span>
            <h3 className="mt-5 font-semibold text-ink">{t("managedByAdministration")}</h3>
            <p className="mt-1 text-sm text-muted">
              {t("administrationDescription")}
            </p>
          </article>
          {rewards.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface px-5">
              {rewards.map((reward) => (
                <li key={reward.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {reward.reward_reason ? t(REASON_KEYS[reward.reward_reason]) : t("fallbackReward")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {date.format(new Date(reward.created_at * 1000))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="nums text-sm text-ink">{currency.format(reward.amount_cents / 100)}</strong>
                    <StatusPill tone={reward.status === "FAILED" ? "warning" : "positive"}>
                      {STATUS_KEYS[reward.status as keyof typeof STATUS_KEYS]
                        ? t(STATUS_KEYS[reward.status as keyof typeof STATUS_KEYS])
                        : reward.status}
                    </StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl bg-deep p-5 text-white">
            <Wallet size={24} className="text-lime" />
            <h2 className="mt-4 text-xl font-semibold">{t("registerTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-white/68">
              {t("registerDescription")}
            </p>
          </section>
          <section className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
            <LockKey size={21} className="shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold text-ink">{t("protectedDebit")}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {t("protectedDebitDescription")}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
