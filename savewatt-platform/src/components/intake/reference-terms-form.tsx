"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ReferenceTerms } from "@/lib/intake/intake-plan";
import type { ReferenceTermsRecord } from "@/lib/intake/reference-terms-repository";

const CADRANS = ["HPH", "HCH", "HPE", "HCE"] as const;

export function ReferenceTermsForm({
  current,
  prefill,
  passThrough,
}: {
  current: ReferenceTermsRecord | null;
  prefill?: Omit<ReferenceTerms, "autoSend" | "minConfidence"> | null;
  passThrough: { ceeEurMwh: number; capacityEurMwh: number } | null;
}) {
  const t = useTranslations("intake.reference");
  const source = current ?? prefill ?? null;
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(CADRANS.map((cadran) => [cadran, source?.prices[cadran]?.toString() ?? ""])),
  );
  const [subscription, setSubscription] = useState(source?.subscriptionEurMonth.toString() ?? "");
  const [termYears, setTermYears] = useState(source?.termYears.toString() ?? "3");
  const [validUntil, setValidUntil] = useState(source?.validUntil ?? "");
  const [autoSend, setAutoSend] = useState(current?.autoSend ?? false);
  const [minConfidence, setMinConfidence] = useState(String(Math.round((current?.minConfidence ?? 0.8) * 100)));
  const [version, setVersion] = useState(current?.version ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const decimal = (value: string) => Number(value.replace(",", "."));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/crm/reference-terms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prices: Object.fromEntries(CADRANS.map((cadran) => [cadran, prices[cadran] === "" ? null : decimal(prices[cadran])])),
        subscriptionEurMonth: subscription === "" ? null : decimal(subscription),
        termYears: Number(termYears),
        validUntil,
        autoSend,
        minConfidence: decimal(minConfidence) / 100,
      }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as {
      referenceTerms?: ReferenceTermsRecord;
      field?: string;
      error?: string;
    };
    setBusy(false);
    if (response?.ok && body.referenceTerms) {
      setVersion(body.referenceTerms.version);
      setMessage({ ok: true, text: t("saved", { version: body.referenceTerms.version }) });
    } else {
      setMessage({ ok: false, text: t("error", { field: body?.field ?? body?.error ?? "NETWORK" }) });
    }
  }

  return (
    <form onSubmit={save} className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">{version ? t("current", { version }) : prefill ? t("prefilled") : t("none")}</p>
        <h2 className="mt-4 font-semibold text-ink">{t("pricesTitle")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {CADRANS.map((cadran) => (
            <Field key={cadran} label={cadran} required>
              <Input
                value={prices[cadran]}
                inputMode="decimal"
                required
                onChange={(event) => setPrices((current) => ({ ...current, [cadran]: event.target.value }))}
              />
            </Field>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label={t("subscription")} required>
            <Input value={subscription} inputMode="decimal" required onChange={(event) => setSubscription(event.target.value)} />
          </Field>
          <Field label={t("termYears")} required>
            <Input value={termYears} inputMode="numeric" required onChange={(event) => setTermYears(event.target.value)} />
          </Field>
          <Field label={t("validUntil")} required>
            <Input type="date" value={validUntil} required onChange={(event) => setValidUntil(event.target.value)} />
          </Field>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          {passThrough
            ? t("passThrough", { cee: passThrough.ceeEurMwh, capacity: passThrough.capacityEurMwh })
            : t("passThroughMissing")}
        </p>
      </section>
      <aside className="rounded-2xl border border-line bg-surface p-5">
        <label className="flex items-start gap-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={autoSend} onChange={(event) => setAutoSend(event.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
          {t("autoSend")}
        </label>
        <p className="mt-2 text-xs leading-5 text-muted">{t("autoSendHint")}</p>
        <div className="mt-4">
          <Field label={t("minConfidence")}>
            <Input value={minConfidence} inputMode="numeric" onChange={(event) => setMinConfidence(event.target.value)} />
          </Field>
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={busy}>
          {busy ? t("saving") : t("save")}
        </Button>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "mt-3 text-sm text-accent-ink" : "mt-3 text-sm text-danger"}>
            {message.text}
          </p>
        ) : null}
      </aside>
    </form>
  );
}
