"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Warning, ArrowRight, Info } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import type { Dossier } from "@/lib/types";
import { compare } from "@/lib/compare";
import { store } from "@/lib/store";
import { eur, num } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ProposalBuilder({ dossier }: { dossier: Dossier }) {
  const t = useTranslations("comparator");
  const tcad = useTranslations("cadran");
  const tu = useTranslations("units");
  const locale = useLocale();
  const router = useRouter();

  const current = dossier.current!;
  const proposal = dossier.proposal!;
  const [margin, setMargin] = useState(proposal.marginEurMwh);

  const result = compare(current, { ...proposal, marginEurMwh: margin });

  function setMarginValue(v: number) {
    const clamped = Math.max(0, Math.min(40, v));
    setMargin(clamped);
    store.update(dossier.id, { proposal: { ...proposal, marginEurMwh: clamped } });
  }

  function generate() {
    store.update(dossier.id, {
      proposal: { ...proposal, marginEurMwh: margin },
      status: "proposalReady",
    });
    router.push(`/dossiers/${dossier.id}/proposal`);
  }

  const alerts = [
    result.alerts.winterMissing && t("alertWinterMissing"),
    result.alerts.hcOverHp && t("alertHcOverHp"),
    result.alerts.offerExpiring && t("alertOfferExpiring"),
  ].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="mt-0.5 text-[13px] text-muted">{t("subtitle")}</p>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto rounded-[0.7rem] border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[12px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2 text-left font-medium">{t("current")} / {t("proposed")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("current")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("proposed")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("delta")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("gainYear")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.rows.map((r) => {
                const comparable = r.gainPerYear !== null;
                return (
                  <tr key={r.cadran} className={cn(!comparable && "opacity-55")}>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-ink">{r.cadran}</span>
                      <span className="ml-2 hidden text-[12px] text-faint sm:inline">
                        {tcad(r.cadran)}
                      </span>
                    </td>
                    <td className="nums px-3 py-2.5 text-right text-muted">
                      {r.currentEurMwh === null ? "—" : num(r.currentEurMwh, locale)}
                    </td>
                    <td className="nums px-3 py-2.5 text-right text-ink">
                      {num(r.proposedEurMwh, locale)}
                    </td>
                    <td
                      className={cn(
                        "nums px-3 py-2.5 text-right font-medium",
                        r.deltaEurMwh === null
                          ? "text-faint"
                          : r.deltaEurMwh >= 0
                            ? "text-accent"
                            : "text-danger",
                      )}
                    >
                      {r.deltaEurMwh === null
                        ? "—"
                        : `${r.deltaEurMwh >= 0 ? "−" : "+"}${num(Math.abs(r.deltaEurMwh), locale)}`}
                    </td>
                    <td className="nums px-3 py-2.5 text-right font-medium text-ink">
                      {r.gainPerYear === null ? "—" : eur(r.gainPerYear, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Margin lever — hidden from the client */}
        <div className="mt-5 rounded-[0.7rem] border border-line bg-surface-2 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-ink">{t("marginLabel")}</p>
              <p className="text-[12px] text-faint">{t("marginHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={40}
                step={1}
                value={margin}
                onChange={(e) => setMarginValue(Number(e.target.value))}
                className="nums h-9 w-20 rounded-[0.5rem] border border-line-strong bg-surface px-2 text-right text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[13px] text-muted">{tu("eurPerMwh")}</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={margin}
            onChange={(e) => setMarginValue(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-accent)]"
          />
        </div>

        {/* Savings summary */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={t("annualSaving")} value={eur(result.annualSaving, locale)} highlight />
          <Stat label={t("subscriptionSaving")} value={eur(result.subscriptionSaving, locale)} />
          <Stat
            label={t("termSaving")}
            value={eur(result.termSaving, locale)}
            sub={`${result.termYears} ${tu("years")}`}
          />
        </div>

        {alerts.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Warning size={15} weight="fill" className="text-warning" />
              {t("alertsTitle")}
            </p>
            <ul className="space-y-1.5">
              {alerts.map((a) => (
                <li
                  key={a}
                  className="flex items-start gap-2 rounded-[0.55rem] border border-warning/20 bg-warning-soft px-3 py-2 text-[13px] text-warning"
                >
                  <Info size={15} weight="fill" className="mt-0.5 shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={generate}>
            {t("buildCta")}
            <ArrowRight size={17} weight="bold" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[0.7rem] border px-4 py-3",
        highlight ? "border-accent/30 bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <p className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className={cn("nums mt-1 text-lg font-semibold", highlight ? "text-accent-ink" : "text-ink")}>
        {value}
      </p>
      {sub && <p className="text-[12px] text-muted">{sub}</p>}
    </div>
  );
}
