"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { PricingParameterRecord } from "@/lib/offers/offer-types";
import { classifyDatedVersions, VersionHistory } from "./version-history";

interface PricingParametersFormProps {
  effective: PricingParameterRecord | null;
  history: PricingParameterRecord[];
  preview: boolean;
}

const num = (value: number | undefined) => (value === undefined ? "" : String(value));
const percent = (value: number | undefined) => (value === undefined ? "" : String(value * 100));

export function PricingParametersForm({ effective, history, preview }: PricingParametersFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const states = classifyDatedVersions(history);
  const fixed = (value: number | undefined) => (value === undefined ? "—" : value.toFixed(2));
  const historyColumns = [
    { key: "cee", label: "CEE" },
    { key: "capacity", label: t("history.capacity") },
    { key: "accise", label: t("history.accise") },
    { key: "cta", label: "CTA %" },
    { key: "tva", label: "TVA %" },
    { key: "gestion", label: t("history.gestion") },
    { key: "comptage", label: t("history.comptage") },
    { key: "soutirage", label: t("history.soutirage") },
    { key: "HPH", label: "HPH" },
    { key: "HCH", label: "HCH" },
    { key: "HPE", label: "HPE" },
    { key: "HCE", label: "HCE" },
  ];
  const historyRows = history.map((record) => ({
    id: record.id,
    version: record.version,
    state: states.get(record.id) ?? "previous",
    effectiveFrom: record.effectiveFrom,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    values: {
      cee: fixed(record.ceeEurMwh),
      capacity: fixed(record.capacityEurMwh),
      accise: fixed(record.acciseEurMwh),
      cta: (record.ctaRate * 100).toFixed(2),
      tva: (record.tvaRate * 100).toFixed(2),
      gestion: fixed(record.turpeFixed.gestionCentsPerDay),
      comptage: fixed(record.turpeFixed.comptageCentsPerDay),
      soutirage: fixed(record.turpeFixed.soutirageFixeCentsPerKwPerDay),
      HPH: fixed(record.turpeVariable.HPH),
      HCH: fixed(record.turpeVariable.HCH),
      HPE: fixed(record.turpeVariable.HPE),
      HCE: fixed(record.turpeVariable.HCE),
    },
  }));

  async function submit(formData: FormData) {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/crm/pricing-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ceeEurMwh: Number(formData.get("ceeEurMwh")),
          capacityEurMwh: Number(formData.get("capacityEurMwh")),
          acciseEurMwh: Number(formData.get("acciseEurMwh")),
          ctaRate: Number(formData.get("ctaRatePercent")) / 100,
          tvaRate: Number(formData.get("tvaRatePercent")) / 100,
          turpeFixed: {
            gestionCentsPerDay: Number(formData.get("gestionCentsPerDay")),
            comptageCentsPerDay: Number(formData.get("comptageCentsPerDay")),
            soutirageFixeCentsPerKwPerDay: Number(formData.get("soutirageFixeCentsPerKwPerDay")),
          },
          turpeVariable: {
            HPH: Number(formData.get("turpeHph")),
            HCH: Number(formData.get("turpeHch")),
            HPE: Number(formData.get("turpeHpe")),
            HCE: Number(formData.get("turpeHce")),
          },
          effectiveFrom: formData.get("effectiveFrom") || undefined,
        }),
      });
      const result = (await response.json()) as {
        pricingParameters?: PricingParameterRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "PRICING_PARAMETERS_SAVE_FAILED");
      setFeedback(t("pricingSaved", { version: result.pricingParameters?.version ?? 0 }));
      router.refresh();
    } catch (error) {
      setFeedback(
        t("gridSaveFailed", { code: error instanceof Error ? error.message : "UNKNOWN" }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
    <section className="rounded-2xl border border-line bg-surface p-5">
      {effective && (
        <p className="text-xs text-muted">
          {t("pricingVersionActive", { version: effective.version, date: effective.effectiveFrom })}
        </p>
      )}
      <form action={submit} className="mt-4 space-y-6">
        <div>
          <p className="text-sm font-semibold text-ink">{t("passThroughRates")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("ceeRate")} required>
              <Input name="ceeEurMwh" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.ceeEurMwh)} />
            </Field>
            <Field label={t("capacityRate")} required>
              <Input name="capacityEurMwh" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.capacityEurMwh)} />
            </Field>
            <Field label={t("acciseRate")} required>
              <Input name="acciseEurMwh" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.acciseEurMwh)} />
            </Field>
            <Field label={t("ctaRate")} required>
              <Input name="ctaRatePercent" type="number" step="0.1" min="0" max="100" required disabled={preview || submitting} defaultValue={percent(effective?.ctaRate)} />
            </Field>
            <Field label={t("tvaRate")} required>
              <Input name="tvaRatePercent" type="number" step="0.1" min="0" max="100" required disabled={preview || submitting} defaultValue={percent(effective?.tvaRate)} />
            </Field>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">{t("turpeFixed")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("gestionPerDay")} required>
              <Input name="gestionCentsPerDay" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeFixed.gestionCentsPerDay)} />
            </Field>
            <Field label={t("comptagePerDay")} required>
              <Input name="comptageCentsPerDay" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeFixed.comptageCentsPerDay)} />
            </Field>
            <Field label={t("soutirageFixePerKw")} required>
              <Input name="soutirageFixeCentsPerKwPerDay" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeFixed.soutirageFixeCentsPerKwPerDay)} />
            </Field>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">{t("turpeVariable")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="HPH (c€/kWh)" required>
              <Input name="turpeHph" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeVariable.HPH)} />
            </Field>
            <Field label="HCH (c€/kWh)" required>
              <Input name="turpeHch" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeVariable.HCH)} />
            </Field>
            <Field label="HPE (c€/kWh)" required>
              <Input name="turpeHpe" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeVariable.HPE)} />
            </Field>
            <Field label="HCE (c€/kWh)" required>
              <Input name="turpeHce" type="number" step="0.01" min="0" required disabled={preview || submitting} defaultValue={num(effective?.turpeVariable.HCE)} />
            </Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("effectiveFrom")} hint={t("effectiveFromHint")}>
            <Input name="effectiveFrom" type="date" disabled={preview || submitting} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={preview || submitting}>
              {submitting ? t("saving") : t("saveNewVersion")}
            </Button>
          </div>
        </div>
        {feedback && <p className="text-xs text-muted">{feedback}</p>}
      </form>
    </section>
    <VersionHistory title={t("history.pricingTitle")} columns={historyColumns} rows={historyRows} />
    </div>
  );
}
