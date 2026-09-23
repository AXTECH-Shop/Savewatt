"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { RewardRecipient } from "@/lib/gifting/gift-redemption-repository";

interface AdminRewardFormProps {
  configured: boolean;
  recipients: RewardRecipient[];
}

const REASONS = [
  ["PARTNER_REFERRAL", "reasons.partnerReferral"],
  ["PERFORMANCE_BONUS", "reasons.performanceBonus"],
  ["MANUAL_ADJUSTMENT", "reasons.manualAdjustment"],
] as const;

export function AdminRewardForm({ configured, recipients }: AdminRewardFormProps) {
  const t = useTranslations("operator.rewards.form");
  const locale = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recipientKey, setRecipientKey] = useState("");
  const selectedRecipient = recipients.find(
    (recipient) =>
      `${recipient.recipientKind}:${recipient.userId}:${recipient.benefitSelectionId ?? "partner"}` ===
      recipientKey,
  );
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });

  async function submit(formData: FormData) {
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/gifting/rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          recipientUserId: selectedRecipient?.userId,
          recipientKind: selectedRecipient?.recipientKind,
          benefitSelectionId: selectedRecipient?.benefitSelectionId,
          amountCents: Number(formData.get("amountEuros")) * 100,
          reason:
            selectedRecipient?.recipientKind === "CUSTOMER"
              ? "CUSTOMER_CHOICE"
              : formData.get("reason"),
        }),
      });
      const result = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "REWARD_ISSUANCE_FAILED");
      setFeedback(t("success", { reference: result.orderId ?? "—" }));
    } catch (error) {
      const code = error instanceof Error ? error.message : "REWARD_ISSUANCE_FAILED";
      setFeedback(t("failure", { code }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-medium text-ink">
        {t("recipient")}
        <select
          className="mt-2 h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm"
          name="recipient"
          required
          disabled={!configured || recipients.length === 0 || submitting}
          value={recipientKey}
          onChange={(event) => setRecipientKey(event.target.value)}
        >
          <option value="" disabled>{t("selectRecipient")}</option>
          {recipients.map((recipient) => (
            <option
              key={`${recipient.recipientKind}:${recipient.organizationId}:${recipient.userId}`}
              value={`${recipient.recipientKind}:${recipient.userId}:${recipient.benefitSelectionId ?? "partner"}`}
            >
              {recipient.recipientKind === "CUSTOMER" ? t("customer") : t("partner")} · {recipient.displayName} · {recipient.organizationName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          {t("amount")}
          <select
            className="mt-2 h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm"
            name="amountEuros"
            required
            disabled={!configured || submitting}
            defaultValue="50"
          >
            {[25, 50, 75, 100, 150, 250, 500].map((amount) => (
              <option key={amount} value={amount}>{currency.format(amount)}</option>
            ))}
          </select>
        </label>
        {selectedRecipient?.recipientKind === "CUSTOMER" ? (
          <div className="text-sm font-medium text-ink">
            {t("reason")}
            <p className="mt-2 flex h-11 items-center rounded-lg border border-line bg-surface-2 px-3 font-normal text-muted">
              {t("customerBenefitChoice")}
            </p>
          </div>
        ) : (
          <label className="block text-sm font-medium text-ink">
            {t("reason")}
            <select
              className="mt-2 h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm"
              name="reason"
              required
              disabled={!configured || submitting}
              defaultValue="PARTNER_REFERRAL"
            >
              {REASONS.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs leading-5 text-muted">
        {t("description")}
      </p>
      <button
        className="press inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={!configured || recipients.length === 0 || submitting}
      >
        {submitting ? t("issuing") : t("submit")}
      </button>
      {!configured && <p className="text-sm text-warning">{t("notConfigured")}</p>}
      {recipients.length === 0 && <p className="text-sm text-muted">{t("noRecipients")}</p>}
      {feedback && <p className="text-sm text-muted" role="status" aria-live="polite">{feedback}</p>}
    </form>
  );
}
