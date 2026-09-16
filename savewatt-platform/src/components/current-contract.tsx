"use client";

import { useLocale, useTranslations } from "next-intl";
import { Warning } from "@phosphor-icons/react";
import type { CurrentContract as CurrentContractType, Proposal } from "@/lib/types";
import { num, dateStr, daysUntil } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export function CurrentContract({
  current,
  proposal,
}: {
  current: CurrentContractType;
  proposal?: Proposal;
}) {
  const t = useTranslations("current");
  const tcad = useTranslations("cadran");
  const tu = useTranslations("units");
  const locale = useLocale();

  const days = daysUntil(current.endDate);
  const expired = days !== null && days < 0;
  const annualMwh = proposal
    ? proposal.lines.reduce((s, l) => s + l.annualVolumeMwh, 0)
    : current.lines.reduce((s, l) => s + l.volumeMwh, 0);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted">{t("subtitle")}</p>
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted">
          {current.supplier}
        </span>
      </CardHeader>
      <CardBody>
        {expired && (
          <div className="mb-4 flex items-start gap-2 rounded-[0.6rem] border border-warning/25 bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
            <span>{t("reconduction")}</span>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Meta label={t("offerName")} value={current.offerName} />
          <Meta
            label={t("endDate")}
            value={dateStr(current.endDate, locale)}
            sub={
              days === null
                ? undefined
                : expired
                  ? t("expired")
                  : t("endsIn", { days })
            }
          />
          <Meta label={t("subscription")} value={`${num(current.subscriptionEurMonth, locale)} ${tu("eurPerMonth")}`} />
          <Meta
            label={t("annualConsumption")}
            value={`${num(annualMwh, locale, 1)} ${tu("mwh")}`}
          />
        </dl>

        <div className="mt-5 overflow-hidden rounded-[0.7rem] border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[12px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2 text-left font-medium">{t("cadran")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("unitPrice")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("volume")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {current.lines.map((l) => (
                <tr key={l.cadran}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-ink">{l.cadran}</span>
                    <span className="ml-2 text-[12px] text-faint">{tcad(l.cadran)}</span>
                  </td>
                  <td className="nums px-3 py-2.5 text-right text-ink">
                    {num(l.unitPriceEurMwh, locale)} {tu("eurPerMwh")}
                  </td>
                  <td className="nums px-3 py-2.5 text-right text-muted">
                    {num(l.volumeMwh, locale, 2)} {tu("mwh")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function Meta({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
      {sub && <dd className="text-[12px] text-muted">{sub}</dd>}
    </div>
  );
}
