"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CustomerBenefitType } from "@/lib/gifting/customer-benefit-repository";

interface CustomerBenefitChoiceProps {
  dossierId: string;
  initialBenefitType: CustomerBenefitType | null;
}

export function CustomerBenefitChoice({
  dossierId,
  initialBenefitType,
}: CustomerBenefitChoiceProps) {
  const t = useTranslations("customerBenefit");
  const [benefitType, setBenefitType] = useState<CustomerBenefitType>(
    initialBenefitType ?? "BILL_REDUCTION",
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function saveSelection() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/customer/benefit-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, benefitType }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "BENEFIT_SELECTION_FAILED");
      setFeedback(t("success"));
    } catch (error) {
      const code = error instanceof Error ? error.message : "BENEFIT_SELECTION_FAILED";
      setFeedback(t("failure", { code }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">{t("legend")}</legend>
        <label className="cursor-pointer rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            className="mr-2 accent-current"
            type="radio"
            name="benefitType"
            value="BILL_REDUCTION"
            checked={benefitType === "BILL_REDUCTION"}
            onChange={() => setBenefitType("BILL_REDUCTION")}
          />
          <strong className="text-sm text-ink">{t("billReduction")}</strong>
          <span className="mt-2 block text-xs leading-5 text-muted">
            {t("billReductionDescription")}
          </span>
        </label>
        <label className="cursor-pointer rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            className="mr-2 accent-current"
            type="radio"
            name="benefitType"
            value="GIFT_CARD"
            checked={benefitType === "GIFT_CARD"}
            onChange={() => setBenefitType("GIFT_CARD")}
          />
          <strong className="text-sm text-ink">{t("giftCard")}</strong>
          <span className="mt-2 block text-xs leading-5 text-muted">
            {t("giftCardDescription")}
          </span>
        </label>
      </fieldset>
      <button
        className="press mt-4 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        type="button"
        onClick={saveSelection}
        disabled={submitting}
      >
        {submitting ? t("saving") : t("confirm")}
      </button>
      {feedback && <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">{feedback}</p>}
    </div>
  );
}
