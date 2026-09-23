"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, FilePdf, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { StatusPill } from "@/components/workspace/status-pill";
import { cn } from "@/lib/cn";
import { eur, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { MarginGridRecord, OfferVersionRecord, SupplierOfferRecord } from "@/lib/offers/offer-types";

const STATUS_TONES: Record<OfferVersionRecord["status"], "neutral" | "positive" | "warning" | "danger"> = {
  DRAFT: "neutral",
  APPROVAL_REQUIRED: "warning",
  APPROVED: "positive",
  SENT: "positive",
  EXPIRED: "danger",
  REVOKED: "danger",
};

export function OfferWorkspace({
  dossierId,
  supplierOffer,
  marginGrid,
  offerVersions,
}: {
  dossierId: string;
  supplierOffer: SupplierOfferRecord | null;
  marginGrid: MarginGridRecord | null;
  offerVersions: OfferVersionRecord[];
}) {
  const t = useTranslations("offerWorkspace");
  const locale = useLocale();
  const router = useRouter();
  const [margin, setMargin] = useState(
    marginGrid ? String(marginGrid.defaultMarginEurMwh) : "",
  );
  const [reason, setReason] = useState("");
  const [selectedId, setSelectedId] = useState(offerVersions[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => offerVersions.find((version) => version.id === selectedId) ?? offerVersions[0] ?? null,
    [offerVersions, selectedId],
  );

  const marginValue = Number(margin.replace(",", "."));
  const marginValid =
    marginGrid &&
    Number.isFinite(marginValue) &&
    marginValue >= marginGrid.minMarginEurMwh &&
    marginValue <= marginGrid.maxMarginEurMwh;
  const needsReason = Boolean(
    marginGrid && marginValid && Number.isFinite(marginValue) && marginValue !== marginGrid.defaultMarginEurMwh,
  );

  async function createVersion() {
    setBusy("create");
    setError(null);
    try {
      const response = await fetch(`/api/crm/dossiers/${dossierId}/offer-versions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          marginEurMwh: Number.isFinite(marginValue) ? marginValue : null,
          marginOverrideReason: reason.trim() || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "CREATE_FAILED");
      router.refresh();
    } catch (failure) {
      setError(t((failure as Error).message === "OFFER_MARGIN_GRID_MISSING" ? "missingMarginGrid" : "createError"));
    } finally {
      setBusy(null);
    }
  }

  async function approve(versionId: string) {
    setBusy(`approve-${versionId}`);
    setError(null);
    try {
      const response = await fetch(`/api/crm/offer-versions/${versionId}/approve`, { method: "POST" });
      if (!response.ok) throw new Error("APPROVE_FAILED");
      router.refresh();
    } catch {
      setError(t("approveError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t("description")}</p>
      </header>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">{t("marginTitle")}</h2>
        {marginGrid ? (
          <>
            <p className="mt-1 text-xs text-muted">
              {t("marginBounds", {
                min: num(marginGrid.minMarginEurMwh, locale),
                max: num(marginGrid.maxMarginEurMwh, locale),
                default: num(marginGrid.defaultMarginEurMwh, locale),
              })}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("marginLabel")}>
                <Input inputMode="decimal" value={margin} onChange={(event) => setMargin(event.target.value)} />
              </Field>
              {needsReason && (
                <Field label={t("marginReasonLabel")}>
                  <Input value={reason} onChange={(event) => setReason(event.target.value)} />
                </Field>
              )}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-warning">{t("missingMarginGrid")}</p>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end">
          <Button onClick={createVersion} disabled={!supplierOffer || !marginGrid || !marginValid || busy !== null || (needsReason && !reason.trim())}>
            {busy === "create" ? t("creating") : t("createVersion")}
          </Button>
        </div>
      </section>

      {offerVersions.length > 0 && selected && (
        <>
          <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold text-ink">{t("versionsTitle")}</h2>
            <ul className="mt-3 divide-y divide-line">
              {offerVersions.map((version) => (
                <li key={version.id}>
                  <button
                    onClick={() => setSelectedId(version.id)}
                    className={cn(
                      "flex w-full flex-wrap items-center gap-3 px-2 py-3 text-left",
                      version.id === selected?.id && "rounded-lg bg-surface-2",
                    )}
                  >
                    <span className="font-mono text-sm font-semibold text-ink">v{version.versionNo}</span>
                    <StatusPill tone={STATUS_TONES[version.status]}>{t(`statuses.${version.status}`)}</StatusPill>
                    <span className="text-sm text-muted">
                      {t("versionGain", { value: eur(version.comparison.annualSaving, locale) })}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-faint">{version.sha256.slice(0, 12)}…</span>
                    {version.status === "APPROVAL_REQUIRED" && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          approve(version.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.stopPropagation();
                            approve(version.id);
                          }
                        }}
                        className="press rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {busy === `approve-${version.id}` ? "…" : t("approve")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{t("comparisonTitle")}</h2>
                <p className="mt-1 text-xs text-muted">
                  {t("termGain", { value: eur(selected.comparison.termSaving, locale) })}
                </p>
              </div>
              {selected.status === "SENT" && (
                <StatusPill tone="positive">
                  <CheckCircle size={13} className="mr-1" /> {t("statuses.SENT")}
                </StatusPill>
              )}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-faint">
                    <th className="px-3 py-2 text-left font-medium">{t("cadran")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("currentPrice")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("offerPrice")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("annualGain")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selected.comparison.rows.map((row) => (
                    <tr key={row.cadran}>
                      <td className="px-3 py-2.5 font-mono text-xs text-ink">{row.cadran}</td>
                      <td className="nums px-3 py-2.5 text-right text-muted">
                        {row.currentEurMwh !== null ? `${num(row.currentEurMwh, locale)} €/MWh` : "—"}
                      </td>
                      <td className="nums px-3 py-2.5 text-right text-ink">
                        {num(row.proposedEurMwh, locale)} €/MWh
                      </td>
                      <td className="nums px-3 py-2.5 text-right text-accent">
                        {row.gainPerYear !== null ? eur(row.gainPerYear, locale) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(selected.status === "APPROVED" || selected.status === "DRAFT") && marginGrid && (
              <OfferSendBar offerVersionId={selected.id} disabled={busy !== null} />
            )}
            {selected.status === "SENT" && (
              <div className="mt-4 flex justify-end">
                <a
                  href={`/api/crm/offer-versions/${selected.id}/pdf`}
                  className="press inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent"
                >
                  <FilePdf size={16} /> {t("downloadPdf")}
                </a>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function OfferSendBar({ offerVersionId, disabled }: { offerVersionId: string; disabled: boolean }) {
  const t = useTranslations("offerWorkspace");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/offer-versions/${offerVersionId}/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ recipientEmail: email.trim() || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "SEND_FAILED");
      setDone(true);
      router.refresh();
    } catch {
      setError(t("sendError"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent-ink">
        <PaperPlaneTilt size={16} /> {t("sendDone")}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label={t("recipientEmail")}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("recipientPlaceholder")}
          />
        </Field>
      </div>
      <Button onClick={send} disabled={disabled || busy}>
        {busy ? t("sending") : (
          <>
            {t("sendCta")} <ArrowRight size={16} />
          </>
        )}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
