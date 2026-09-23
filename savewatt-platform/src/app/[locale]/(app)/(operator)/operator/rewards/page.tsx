import { Gift, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminRewardForm } from "@/components/gifting/admin-reward-form";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";
import { GiftRedemptionRepository } from "@/lib/gifting/gift-redemption-repository";

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

export default async function OperatorRewardsPage() {
  const t = await getTranslations("operator.rewards");
  const locale = await getLocale();
  const repository = new GiftRedemptionRepository();
  const [partners, customers, rewards] = await Promise.all([
    repository.listEligiblePartners(),
    repository.listPendingCustomerRewards(),
    repository.listRecent(),
  ]);
  const recipients = [...customers, ...partners];
  const configured = Boolean(
    process.env.TREMENDOUS_API_KEY &&
      process.env.TREMENDOUS_CAMPAIGN_ID &&
      !process.env.TREMENDOUS_API_KEY.includes("demo"),
  );
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });

  return (
    <div className="rise">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Gift size={22} />
            </span>
            <div>
              <h2 className="font-semibold text-ink">{t("newReward")}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {t("newRewardDescription")}
              </p>
            </div>
          </div>
          <AdminRewardForm configured={configured} recipients={recipients} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <ShieldCheck size={21} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold text-ink">{t("history")}</h2>
              <p className="mt-1 text-xs text-muted">{t("historyDescription")}</p>
            </div>
          </div>
          {rewards.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t("recipient")}</th>
                    <th className="px-5 py-3 font-medium">{t("reason")}</th>
                    <th className="px-5 py-3 font-medium">{t("amount")}</th>
                    <th className="px-5 py-3 font-medium">{t("state")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rewards.map((reward) => (
                    <tr key={reward.id}>
                      <td className="px-5 py-4">
                        <strong className="block font-medium text-ink">{reward.recipient_name}</strong>
                        <span className="text-xs text-muted">{reward.recipient_email}</span>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {reward.reward_reason ? t(REASON_KEYS[reward.reward_reason]) : t("notProvided")}
                      </td>
                      <td className="nums px-5 py-4 font-medium text-ink">
                        {currency.format(reward.amount_cents / 100)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill tone={reward.status === "FAILED" ? "warning" : "positive"}>
                          {STATUS_KEYS[reward.status as keyof typeof STATUS_KEYS]
                            ? t(STATUS_KEYS[reward.status as keyof typeof STATUS_KEYS])
                            : reward.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
