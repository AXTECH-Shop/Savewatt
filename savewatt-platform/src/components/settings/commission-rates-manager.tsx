"use client";

import { Fragment, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClockCounterClockwise, PencilSimple } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { computeCommissionShares } from "@/lib/commissions/commission-shares";
import type {
  CommissionRateTree,
  CommissionRateVersion,
} from "@/lib/commissions/commission-rate-repository";
import { VersionHistory } from "./version-history";

interface CommissionRatesManagerProps {
  tree: CommissionRateTree;
  /** Admin view: amounts are shares of the SaveWatt margin. */
  isOperator: boolean;
  /** Settings page allows editing; the overview page is read-only. */
  editable: boolean;
  preview: boolean;
}

const ERROR_KEYS: Record<string, string> = {
  CRM_CONFLICT: "errors.totalExceeded",
  CRM_INVALID_INPUT: "errors.invalidRate",
  CRM_FORBIDDEN: "errors.forbidden",
};

export function CommissionRatesManager({ tree, isOperator, editable, preview }: CommissionRatesManagerProps) {
  const t = useTranslations("commissionRates");
  const locale = useLocale();
  const router = useRouter();
  const [exampleAmount, setExampleAmount] = useState(100);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftRate, setDraftRate] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, CommissionRateVersion[]>>({});

  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  const percent = (value: number) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} %`;
  const shares = useMemo(
    () => computeCommissionShares(tree.nodes, tree.rootId, Number.isFinite(exampleAmount) ? exampleAmount : 0),
    [tree, exampleAmount],
  );
  const root = tree.nodes.find((node) => node.organizationId === tree.rootId);
  const rootShare = shares.get(tree.rootId);
  const rows = tree.nodes.filter((node) => shares.has(node.organizationId));

  function startEdit(organizationId: string, ratePercent: number | null) {
    setEditing(organizationId);
    setDraftRate(ratePercent === null ? "" : String(ratePercent));
    setDraftNote("");
    setFeedback(null);
  }

  async function loadHistory(organizationId: string, force = false) {
    if (!force && history[organizationId]) return;
    const response = await fetch(`/api/commissions/rates/${organizationId}/history`);
    const result = (await response.json()) as { versions?: CommissionRateVersion[] };
    setHistory((current) => ({ ...current, [organizationId]: result.versions ?? [] }));
  }

  async function toggleHistory(organizationId: string) {
    if (historyOpen === organizationId) {
      setHistoryOpen(null);
      return;
    }
    setHistoryOpen(organizationId);
    await loadHistory(organizationId);
  }

  async function save(organizationId: string) {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/commissions/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, ratePercent: Number(draftRate), note: draftNote }),
      });
      const result = (await response.json()) as { rate?: CommissionRateVersion; error?: string };
      if (!response.ok) throw new Error(result.error ?? "UNKNOWN");
      setEditing(null);
      setFeedback({ id: organizationId, message: t("saved", { version: result.rate?.version ?? 0 }) });
      if (historyOpen === organizationId) await loadHistory(organizationId, true);
      else
        setHistory((current) => {
          const next = { ...current };
          delete next[organizationId];
          return next;
        });
      router.refresh();
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      setFeedback({ id: organizationId, message: ERROR_KEYS[code] ? t(ERROR_KEYS[code]) : t("errors.generic", { code }) });
    } finally {
      setSaving(false);
    }
  }

  if (preview || !root) {
    return <p className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">{t("unavailable")}</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      <MetricStrip
        items={[
          isOperator
            ? { label: t("metrics.margin"), value: "100 %" }
            : { label: t("metrics.yourRate"), value: root.ratePercent === null ? t("notSet") : percent(root.ratePercent), detail: t("metrics.yourRateDetail") },
          { label: t("metrics.distributed"), value: percent(rootShare?.childrenRateTotal ?? 0), tone: (rootShare?.childrenRateTotal ?? 0) > 100 ? "warning" : "default" },
          { label: isOperator ? t("metrics.operatorKeeps") : t("metrics.youKeep"), value: percent(100 - (rootShare?.childrenRateTotal ?? 0)), tone: "positive" },
          { label: t("metrics.accounts"), value: String(Math.max(rows.length - 1, 0)) },
        ]}
      />

      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink">{t("ruleTitle")}</p>
        <p className="mt-1 text-sm text-muted">{isOperator ? t("ruleOperator") : t("ruleNetwork")}</p>
        <label className="mt-4 flex max-w-xs flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">{isOperator ? t("exampleMargin") : t("exampleCommission")}</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={Number.isFinite(exampleAmount) ? exampleAmount : ""}
            onChange={(event) => setExampleAmount(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-faint">
              <tr>
                <th scope="col" className="px-4 py-3">{t("columns.account")}</th>
                <th scope="col" className="px-4 py-3 text-right">{t("columns.rate")}</th>
                <th scope="col" className="px-4 py-3 text-right">{t("columns.receives")}</th>
                <th scope="col" className="px-4 py-3 text-right">{t("columns.keeps")}</th>
                <th scope="col" className="px-4 py-3 text-right">{t("columns.children")}</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">{t("columns.actions")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((node) => {
                const share = shares.get(node.organizationId);
                const isRoot = node.organizationId === tree.rootId;
                const indent = Math.max(node.depth - (root.depth ?? 0), 0);
                return (
                  <Fragment key={node.organizationId}>
                    <tr className={isRoot ? "bg-surface-2/60" : undefined}>
                      <td className="px-4 py-3">
                        <div style={{ paddingLeft: `${indent * 1.25}rem` }}>
                          <p className="font-medium text-ink">{node.name}</p>
                          <p className="text-xs text-muted">
                            {t(`kinds.${node.kind}`)}
                            {node.version ? ` · v${node.version}` : ""}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {editing === node.organizationId ? (
                          <Input
                            aria-label={t("columns.rate")}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="ml-auto w-28 text-right"
                            value={draftRate}
                            onChange={(event) => setDraftRate(event.target.value)}
                            autoFocus
                          />
                        ) : isRoot && isOperator ? (
                          "100 %"
                        ) : node.ratePercent === null ? (
                          <span className="text-faint">{t("notSet")}</span>
                        ) : (
                          percent(node.ratePercent)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink">{currency.format(share?.received ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted">{currency.format(share?.kept ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {share && share.childrenRateTotal > 0 ? percent(share.childrenRateTotal) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {editable && node.canEdit && editing !== node.organizationId && (
                            <Button size="sm" variant="ghost" onClick={() => startEdit(node.organizationId, node.ratePercent)}>
                              <PencilSimple size={15} />
                              {t("edit")}
                            </Button>
                          )}
                          {node.version !== null && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-expanded={historyOpen === node.organizationId}
                              onClick={() => toggleHistory(node.organizationId)}
                            >
                              <ClockCounterClockwise size={15} />
                              {t("history")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {editing === node.organizationId && (
                      <tr className="bg-surface-2/50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
                              <span className="text-[13px] font-medium text-ink">{t("note")}</span>
                              <Input value={draftNote} maxLength={280} onChange={(event) => setDraftNote(event.target.value)} placeholder={t("notePlaceholder")} />
                            </label>
                            <Button size="sm" disabled={saving || draftRate === ""} onClick={() => save(node.organizationId)}>
                              {saving ? t("saving") : t("save")}
                            </Button>
                            <Button size="sm" variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
                              {t("cancel")}
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-muted">{t("editHint")}</p>
                        </td>
                      </tr>
                    )}
                    {feedback?.id === node.organizationId && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-3 text-xs text-muted" role="status">{feedback.message}</td>
                      </tr>
                    )}
                    {historyOpen === node.organizationId && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4">
                          <VersionHistory
                            title={t("historyTitle", { account: node.name })}
                            columns={[{ key: "rate", label: t("columns.rate") }]}
                            rows={(history[node.organizationId] ?? []).map((version) => ({
                              id: version.id,
                              version: version.version,
                              state: version.status === "ACTIVE" ? "current" : "previous",
                              createdAt: version.createdAt,
                              createdBy: version.createdBy,
                              note: version.note,
                              values: { rate: percent(version.ratePercent) },
                            }))}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
