"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Printer, PenNib, ArrowRight } from "@phosphor-icons/react";
import { Link, useRouter } from "@/i18n/navigation";
import { useDossier, store } from "@/lib/store";
import { compare, proposedPrice } from "@/lib/compare";
import { eur, num, dateStr } from "@/lib/format";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const d = useDossier(id);
  const t = useTranslations("proposal");
  const tc = useTranslations("common");
  const tcad = useTranslations("cadran");
  const tu = useTranslations("units");
  const tcur = useTranslations("current");
  const locale = useLocale();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  if (!d?.current || !d?.proposal) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center text-muted">
        {tc("notFound")}
        <div>
          <Link href="/" className="mt-3 inline-block text-accent hover:underline">
            {tc("back")}
          </Link>
        </div>
      </div>
    );
  }

  const result = compare(d.current, d.proposal);

  async function send() {
    setSending(true);
    setError(false);
    try {
      const res = await fetch("/api/docuseal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossierId: id,
          clientName: d!.clientName,
          email: d!.contactEmail,
          annualSaving: result.annualSaving,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url || !data.submissionId) {
        throw new Error(data.error ?? "SIGNATURE_REQUEST_FAILED");
      }
      store.update(id, {
        status: "sent",
        signing: {
          provider: data.provider,
          submissionId: data.submissionId,
          url: data.url,
          signed: false,
        },
      });
      router.push(`/dossiers/${id}/sign`);
    } catch {
      setError(true);
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl rise">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href={`/dossiers/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={16} /> {tc("back")}
        </Link>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer size={16} /> {t("downloadCta")}
        </Button>
      </div>

      {/* Document */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <div className="flex items-start justify-between border-b border-line px-7 py-6">
          <div>
            <BrandLockup />
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {t("subtitle", { client: d.clientName, site: d.pdl ?? "—" })}
            </p>
          </div>
          <div className="text-right text-[13px] text-muted">
            <p className="font-medium text-ink">{t("validUntil")}</p>
            <p className="nums">{dateStr(d.proposal.validUntil, locale)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 px-7 py-5 text-[13px]">
          <div>
            <p className="font-medium uppercase tracking-wide text-faint">{t("for")}</p>
            <p className="mt-1 font-medium text-ink">{d.clientName}</p>
            {d.contactName && <p className="text-muted">{d.contactName}</p>}
            {d.contactEmail && <p className="text-muted">{d.contactEmail}</p>}
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wide text-faint">{t("preparedBy")}</p>
            <p className="mt-1 font-medium text-ink">SaveWatt</p>
          </div>
        </div>

        {/* Savings headline */}
        <div className="mx-7 mb-6 rounded-[var(--radius-card)] border border-accent/25 bg-accent-soft px-6 py-5">
          <p className="text-[13px] font-medium text-accent-ink">{t("yourSaving")}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="nums text-3xl font-semibold text-accent-ink">
              {eur(result.annualSaving, locale)}
            </span>
            <span className="text-sm text-accent-ink/80">{t("perYear")}</span>
            <span className="nums text-lg font-medium text-accent-ink/90">
              {eur(result.termSaving, locale)}
            </span>
            <span className="text-sm text-accent-ink/80">{t("overTerm")}</span>
          </div>
        </div>

        {/* Current vs offer */}
        <div className="grid grid-cols-1 gap-4 px-7 sm:grid-cols-2">
          <Panel title={t("currentSituation")}>
            <Row label={tcur("supplier")} value={d.current.supplier} />
            <Row label={tcur("offerName")} value={d.current.offerName} />
            <Row
              label={tcur("subscription")}
              value={`${num(d.current.subscriptionEurMonth, locale)} ${tu("eurPerMonth")}`}
            />
          </Panel>
          <Panel title={t("ourOffer")} accent>
            <Row label={tcur("supplier")} value="Savewatt" />
            <Row
              label={tcur("subscription")}
              value={`${num(d.proposal.subscriptionEurMonth, locale)} ${tu("eurPerMonth")}`}
            />
            <Row
              label={tcur("endDate")}
              value={`${d.proposal.termYears} ${tu("years")}`}
            />
          </Panel>
        </div>

        {/* Offer price table — final client prices only */}
        <div className="mx-7 my-6 overflow-hidden rounded-[0.7rem] border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[12px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2 text-left font-medium">{tcur("cadran")}</th>
                <th className="px-3 py-2 text-right font-medium">{tcur("unitPrice")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.proposal.lines.map((l) => (
                <tr key={l.cadran}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-ink">{l.cadran}</span>
                    <span className="ml-2 text-[12px] text-faint">{tcad(l.cadran)}</span>
                  </td>
                  <td className="nums px-3 py-2.5 text-right text-ink">
                    {num(proposedPrice(d.proposal!, l.electronEurMwh), locale)} {tu("eurPerMwh")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="px-7 pb-6 text-[12px] leading-relaxed text-faint">{t("disclaimer")}</p>
        <footer className="border-t border-line px-7 py-5 text-[10px] leading-4 text-faint">
          <strong className="font-semibold text-muted">AX TECH — ECOLED WAVE CONCEPT</strong> · SAS ·
          SIREN 751 982 760 · SIRET 751 982 760 00041 · TVA FR86 751 982 760<br />
          8 rue Marbeau, 75016 Paris · contact@savewatt.fr
        </footer>
      </div>

      {/* Action bar */}
      <div className="no-print sticky bottom-4 mt-5 flex items-center justify-end gap-3 rounded-[var(--radius-card)] border border-line bg-surface/90 px-4 py-3 shadow-diffuse backdrop-blur">
        {error && <span className="text-[13px] text-danger">{tc("genericError")}</span>}
        <Button onClick={send} disabled={sending}>
          {sending ? (
            tc("loading")
          ) : (
            <>
              <PenNib size={17} weight="bold" /> {t("sendCta")} <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Panel({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[0.7rem] border px-4 py-3 ${
        accent ? "border-accent/25 bg-accent-soft/40" : "border-line bg-surface-2"
      }`}
    >
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">{title}</p>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
