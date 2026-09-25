"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, SpinnerGap, Trash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/workspace/status-pill";
import { Link } from "@/i18n/navigation";
import type { IntakeDraft } from "@/lib/intake/intake-manager";
import type { OfferVersionRecord } from "@/lib/offers/offer-types";

const CADRANS = ["HPH", "HCH", "HPE", "HCE", "HP", "HC", "BASE"];

type Num = string;
const toText = (value: number | null | undefined): Num => (value === null || value === undefined ? "" : String(value));
const toNumber = (value: Num): number | null => (value.trim() === "" ? null : Number(value.replace(",", ".")));

interface BillLine {
  cadran: string;
  volumeKwh: Num;
  unitPriceEurMwh: Num;
}
interface TermLine {
  cadran: string;
  electronEurMwh: Num;
  annualVolumeMwh: Num;
}

export function IntakeReview({ draft }: { draft: IntakeDraft }) {
  const t = useTranslations("intake");
  const locale = useLocale();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const bill = draft.extraction?.bill ?? null;
  const plan = draft.plan;

  const [fields, setFields] = useState({
    clientName: bill?.clientName ?? "",
    siren: bill?.siren ?? "",
    pdlOrPrm: bill?.pdlOrPrm ?? "",
    supplier: bill?.supplier ?? "",
    subscribedPowerKva: toText(bill?.subscribedPowerKva),
    subscriptionEurPerMonth: toText(bill?.subscriptionEurPerMonth),
    contractEndDate: bill?.contractEndDate ?? "",
  });
  const [consumption, setConsumption] = useState<BillLine[]>(
    (bill?.consumption ?? []).map((line) => ({
      cadran: line.cadran,
      volumeKwh: toText(line.volumeKwh),
      unitPriceEurMwh: toText(line.unitPriceEurMwh),
    })),
  );
  const [terms, setTerms] = useState({
    validUntil: plan?.validUntil ?? "",
    termYears: toText(plan?.termYears ?? 3),
    subscriptionEurMonth: toText(plan?.subscriptionEurMonth),
    ceeEurMwh: toText(plan?.ceeEurMwh),
    capacityEurMwh: toText(plan?.capacityEurMwh),
  });
  const [lines, setLines] = useState<TermLine[]>(
    (plan?.lines ?? []).map((line) => ({
      cadran: line.cadran,
      electronEurMwh: toText(line.electronEurMwh),
      annualVolumeMwh: toText(line.annualVolumeMwh),
    })),
  );
  const [margin, setMargin] = useState(toText(draft.marginGrid?.default));
  const [reason, setReason] = useState("");
  const [offer, setOffer] = useState<OfferVersionRecord | null>(draft.offerVersion);
  const [recipient, setRecipient] = useState(draft.submission.contact.email ?? "");
  const [busy, setBusy] = useState<"offer" | "send" | null>(null);
  const [message, setMessage] = useState<{ tone: "positive" | "danger"; text: string } | null>(null);

  const issues = useMemo(
    () => [...new Set([...draft.submission.issues, ...draft.planIssues])],
    [draft.submission.issues, draft.planIssues],
  );
  const marginChanged = draft.marginGrid !== null && toNumber(margin) !== draft.marginGrid.default;

  async function createOffer() {
    setBusy("offer");
    setMessage(null);
    const response = await fetch(`/api/crm/intake/${draft.submission.id}/offer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bill: {
          clientName: fields.clientName,
          siren: fields.siren,
          pdlOrPrm: fields.pdlOrPrm,
          supplier: fields.supplier,
          subscribedPowerKva: toNumber(fields.subscribedPowerKva),
          subscriptionEurPerMonth: toNumber(fields.subscriptionEurPerMonth),
          contractEndDate: fields.contractEndDate || null,
          consumption: consumption.map((line) => ({
            cadran: line.cadran,
            volumeKwh: toNumber(line.volumeKwh),
            unitPriceEurMwh: toNumber(line.unitPriceEurMwh),
          })),
        },
        terms: {
          validUntil: terms.validUntil || null,
          termYears: toNumber(terms.termYears),
          subscriptionEurMonth: toNumber(terms.subscriptionEurMonth),
          ceeEurMwh: toNumber(terms.ceeEurMwh),
          capacityEurMwh: toNumber(terms.capacityEurMwh),
          lines: lines.map((line) => ({
            cadran: line.cadran,
            electronEurMwh: toNumber(line.electronEurMwh),
            annualVolumeMwh: toNumber(line.annualVolumeMwh),
          })),
        },
        marginEurMwh: toNumber(margin),
        marginOverrideReason: marginChanged ? reason || null : null,
      }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as {
      offerVersion?: OfferVersionRecord;
      error?: string;
      field?: string;
    };
    setBusy(null);
    if (response?.ok && body.offerVersion) {
      setOffer(body.offerVersion);
      return;
    }
    setMessage({
      tone: "danger",
      text: t("review.createFailed", { code: body?.error ?? "NETWORK", field: body?.field ? ` · ${body.field}` : "" }),
    });
  }

  async function send() {
    setBusy("send");
    setMessage(null);
    const response = await fetch(`/api/crm/intake/${draft.submission.id}/send`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ recipientEmail: recipient }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as {
      delivery?: { recipientEmail: string; state: string };
      error?: string;
      field?: string;
    };
    setBusy(null);
    if (response?.ok && body.delivery && body.delivery.state !== "FAILED") {
      setMessage({ tone: "positive", text: t("review.sent", { email: body.delivery.recipientEmail }) });
    } else {
      setMessage({ tone: "danger", text: t("review.sendFailed", { code: body?.field ?? body?.error ?? "NETWORK" }) });
    }
  }

  const setField = (key: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));
  const setTerm = (key: keyof typeof terms) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setTerms((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="mt-6 grid gap-6">
      {issues.length ? (
        <section className="rounded-2xl border border-warning/25 bg-warning-soft p-4 text-sm text-warning">
          <ul className="grid gap-1.5">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-2">
                <Warning size={16} className="mt-0.5 shrink-0" />
                {t(`admin.issues.${issue}`)}
              </li>
            ))}
          </ul>
          {issues.includes("REFERENCE_TERMS_MISSING") ? (
            <Link href="/intake/tarifs" className="mt-3 inline-block font-medium underline">
              {t("review.configureReference")}
            </Link>
          ) : null}
        </section>
      ) : null}

      {!bill ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">{t("review.extractionFailed")}</p>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-ink">{t("review.billTitle")}</h2>
              {draft.extraction ? (
                <span className="nums text-xs text-muted">
                  {t("review.confidence", { value: Math.round(draft.extraction.overallConfidence * 100) })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">{t("review.billHint")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("review.clientName")}><Input value={fields.clientName} onChange={setField("clientName")} /></Field>
              <Field label={t("review.siren")}><Input value={fields.siren} onChange={setField("siren")} inputMode="numeric" /></Field>
              <Field label={t("review.pdl")}><Input value={fields.pdlOrPrm} onChange={setField("pdlOrPrm")} inputMode="numeric" /></Field>
              <Field label={t("review.supplier")}><Input value={fields.supplier} onChange={setField("supplier")} /></Field>
              <Field label={t("review.power")}><Input value={fields.subscribedPowerKva} onChange={setField("subscribedPowerKva")} inputMode="decimal" /></Field>
              <Field label={t("review.subscription")}><Input value={fields.subscriptionEurPerMonth} onChange={setField("subscriptionEurPerMonth")} inputMode="decimal" /></Field>
              <Field label={t("review.contractEnd")}><Input type="date" value={fields.contractEndDate} onChange={setField("contractEndDate")} /></Field>
            </div>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-faint">
                <tr>
                  <th className="py-2 pr-3 font-medium">{t("review.cadran")}</th>
                  <th className="py-2 pr-3 font-medium">{t("review.volumeKwh")}</th>
                  <th className="py-2 font-medium">{t("review.priceEurMwh")}</th>
                </tr>
              </thead>
              <tbody>
                {consumption.map((line, index) => (
                  <tr key={index}>
                    <td className="py-1 pr-3 font-mono text-xs text-ink">{line.cadran}</td>
                    <td className="py-1 pr-3">
                      <Input
                        value={line.volumeKwh}
                        inputMode="decimal"
                        onChange={(event) =>
                          setConsumption((rows) => rows.map((row, at) => (at === index ? { ...row, volumeKwh: event.target.value } : row)))
                        }
                      />
                    </td>
                    <td className="py-1">
                      <Input
                        value={line.unitPriceEurMwh}
                        inputMode="decimal"
                        onChange={(event) =>
                          setConsumption((rows) => rows.map((row, at) => (at === index ? { ...row, unitPriceEurMwh: event.target.value } : row)))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">{t("review.termsTitle")}</h2>
            <p className="mt-1 text-sm text-muted">
              {t("review.termsHint")}{" "}
              {plan ? t(`review.volumeBasis.${plan.volumeBasis}`, { months: plan.monthsCovered ?? 0 }) : null}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label={t("review.validUntil")}><Input type="date" value={terms.validUntil} onChange={setTerm("validUntil")} /></Field>
              <Field label={t("review.termYears")}><Input value={terms.termYears} onChange={setTerm("termYears")} inputMode="numeric" /></Field>
              <Field label={t("review.subscriptionEurMonth")}><Input value={terms.subscriptionEurMonth} onChange={setTerm("subscriptionEurMonth")} inputMode="decimal" /></Field>
              <Field label={t("review.cee")}><Input value={terms.ceeEurMwh} onChange={setTerm("ceeEurMwh")} inputMode="decimal" /></Field>
              <Field label={t("review.capacity")}><Input value={terms.capacityEurMwh} onChange={setTerm("capacityEurMwh")} inputMode="decimal" /></Field>
            </div>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-faint">
                <tr>
                  <th className="py-2 pr-3 font-medium">{t("review.cadran")}</th>
                  <th className="py-2 pr-3 font-medium">{t("review.electron")}</th>
                  <th className="py-2 pr-3 font-medium">{t("review.annualVolume")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="py-1 pr-3">
                      <Select
                        value={line.cadran}
                        onChange={(event) =>
                          setLines((rows) => rows.map((row, at) => (at === index ? { ...row, cadran: event.target.value } : row)))
                        }
                      >
                        {CADRANS.map((cadran) => (
                          <option key={cadran} value={cadran}>{cadran}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-1 pr-3">
                      <Input
                        value={line.electronEurMwh}
                        inputMode="decimal"
                        onChange={(event) =>
                          setLines((rows) => rows.map((row, at) => (at === index ? { ...row, electronEurMwh: event.target.value } : row)))
                        }
                      />
                    </td>
                    <td className="py-1 pr-3">
                      <Input
                        value={line.annualVolumeMwh}
                        inputMode="decimal"
                        onChange={(event) =>
                          setLines((rows) => rows.map((row, at) => (at === index ? { ...row, annualVolumeMwh: event.target.value } : row)))
                        }
                      />
                    </td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        className="press rounded-md p-2 text-muted hover:text-danger"
                        aria-label={t("review.removeLine")}
                        onClick={() => setLines((rows) => rows.filter((_, at) => at !== index))}
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setLines((rows) => [...rows, { cadran: "HPE", electronEurMwh: "", annualVolumeMwh: "" }])}
            >
              <Plus size={14} />
              {t("review.addLine")}
            </Button>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field
                label={t("review.margin")}
                hint={
                  draft.marginGrid
                    ? t("review.marginHint", { min: draft.marginGrid.min, max: draft.marginGrid.max, def: draft.marginGrid.default })
                    : undefined
                }
              >
                <Input value={margin} onChange={(event) => setMargin(event.target.value)} inputMode="decimal" />
              </Field>
              {marginChanged ? (
                <Field label={t("review.marginReason")}>
                  <Input value={reason} onChange={(event) => setReason(event.target.value)} />
                </Field>
              ) : null}
            </div>
            <Button className="mt-5" onClick={createOffer} disabled={busy !== null || lines.length === 0}>
              {busy === "offer" ? <SpinnerGap size={16} className="animate-spin" /> : null}
              {busy === "offer" ? t("review.creatingOffer") : t("review.createOffer")}
            </Button>
          </section>
        </>
      )}

      {offer ? (
        <section className="rounded-2xl bg-deep p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("review.offerTitle", { version: offer.versionNo })}</h2>
            <StatusPill tone={offer.status === "APPROVAL_REQUIRED" ? "warning" : "positive"}>
              {t(`review.offerStatus.${offer.status}`)}
            </StatusPill>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-white/60">{t("review.annualSaving")}</dt>
              <dd className="nums mt-1 text-2xl font-semibold">{money.format(offer.comparison.annualSaving)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/60">{t("review.termSaving")}</dt>
              <dd className="nums mt-1 text-2xl font-semibold">{money.format(offer.comparison.termSaving)}</dd>
            </div>
            {offer.budget ? (
              <div>
                <dt className="text-xs text-white/60">{t("review.budgetTtc")}</dt>
                <dd className="nums mt-1 text-2xl font-semibold">{money.format(offer.budget.totalTtcEur)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <a className="underline" href={`/api/crm/offer-versions/${offer.id}/pdf?kind=marketing`} target="_blank" rel="noreferrer">
              {t("review.previewMarketing")}
            </a>
            <a className="underline" href={`/api/crm/offer-versions/${offer.id}/pdf`} target="_blank" rel="noreferrer">
              {t("review.previewBudget")}
            </a>
          </div>
          {offer.status === "DRAFT" || offer.status === "APPROVED" ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1.5 text-[13px]">
                {t("review.recipient")}
                <input
                  type="email"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  className="h-10 rounded-[0.6rem] border border-white/20 bg-white/10 px-3 text-sm text-white outline-none focus:border-white/60"
                />
              </label>
              <Button onClick={send} disabled={busy !== null || !recipient}>
                {busy === "send" ? <SpinnerGap size={16} className="animate-spin" /> : null}
                {busy === "send" ? t("review.sending") : t("review.send")}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <p
          role={message.tone === "danger" ? "alert" : "status"}
          className={message.tone === "danger" ? "rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" : "rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-ink"}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
