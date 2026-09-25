"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusPill } from "@/components/workspace/status-pill";
import type { EffectiveWorkflow, WorkflowVersion } from "@/lib/workflows/workflow-repository";
import { diffWorkflowStages, type WorkflowStage } from "@/lib/workflows/workflow-stages";

interface WorkflowEditorProps {
  effective: EffectiveWorkflow;
  history: WorkflowVersion[];
  preview: boolean;
}

export function WorkflowEditor({ effective, history, preview }: WorkflowEditorProps) {
  const t = useTranslations("workflowSettings");
  const locale = useLocale();
  const router = useRouter();
  const [stages, setStages] = useState<WorkflowStage[]>(() => effective.stages.map((stage) => ({ ...stage })));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [openVersion, setOpenVersion] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const dirty = diffWorkflowStages(effective.stages, stages).length > 0;

  const update = (index: number, patch: Partial<WorkflowStage>) =>
    setStages((current) => current.map((stage, position) => (position === index ? { ...stage, ...patch } : stage)));
  const move = (index: number, offset: number) =>
    setStages((current) => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  async function publish() {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages, note }),
      });
      const result = (await response.json()) as { version?: WorkflowVersion; error?: string; field?: string };
      if (!response.ok) throw new Error(result.field ? `${result.error} (${result.field})` : result.error ?? "UNKNOWN");
      setNote("");
      setFeedback(t("published", { version: result.version?.version ?? 0 }));
      router.refresh();
    } catch (error) {
      setFeedback(t("publishFailed", { code: error instanceof Error ? error.message : "UNKNOWN" }));
    } finally {
      setSaving(false);
    }
  }

  const describeChange = (change: string) => {
    if (change === "order") return t("changes.order");
    const [key, field] = change.split(".");
    const stage = stages.find((candidate) => candidate.key === key);
    return t("changes.field", { stage: stage ? (locale === "en" ? stage.labelEn : stage.labelFr) : key, field: t(`fields.${field}`) });
  };

  return (
    <div className="mt-6 space-y-8">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">{t("stagesTitle")}</p>
            <p className="mt-1 text-xs text-muted">
              {effective.version
                ? effective.inherited
                  ? t("inheritedVersion", { version: effective.version.version })
                  : t("activeVersion", { version: effective.version.version })
                : t("defaults")}
            </p>
          </div>
          {dirty && <StatusPill tone="warning">{t("unpublished")}</StatusPill>}
        </div>
        <ol className="divide-y divide-line">
          {stages.map((stage, index) => (
            <li key={stage.key} className="grid gap-3 px-5 py-4 lg:grid-cols-[auto_1fr_1fr_8rem_auto_auto] lg:items-end">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft font-mono text-xs font-semibold text-accent">{index + 1}</span>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-muted">{t("fields.labelFr")}</span>
                <Input value={stage.labelFr} maxLength={60} disabled={preview || saving} onChange={(event) => update(index, { labelFr: event.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-muted">{t("fields.labelEn")}</span>
                <Input value={stage.labelEn} maxLength={60} disabled={preview || saving} onChange={(event) => update(index, { labelEn: event.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-muted">{t("fields.slaHours")}</span>
                <Input
                  type="number"
                  min="1"
                  max="8760"
                  step="1"
                  value={stage.slaHours ?? ""}
                  placeholder="—"
                  disabled={preview || saving}
                  onChange={(event) => update(index, { slaHours: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </label>
              <label className="flex h-10 items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={stage.visible} disabled={preview || saving} onChange={(event) => update(index, { visible: event.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                {t("fields.visible")}
              </label>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label={t("moveUp")} disabled={preview || saving || index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp size={15} />
                </Button>
                <Button size="sm" variant="ghost" aria-label={t("moveDown")} disabled={preview || saving || index === stages.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown size={15} />
                </Button>
              </div>
              <p className="font-mono text-[11px] text-faint lg:col-span-6">{t("stageKey", { key: stage.key })}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-4">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink">{t("note")}</span>
            <Input value={note} maxLength={280} disabled={preview || saving} placeholder={t("notePlaceholder")} onChange={(event) => setNote(event.target.value)} />
          </label>
          <Button variant="secondary" disabled={preview || saving || !dirty} onClick={() => setStages(effective.stages.map((stage) => ({ ...stage })))}>
            {t("reset")}
          </Button>
          <Button disabled={preview || saving || !dirty} onClick={publish}>
            {saving ? t("publishing") : t("publish")}
          </Button>
        </div>
        {feedback && <p className="px-5 pb-4 text-xs text-muted" role="status">{feedback}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <p className="text-sm font-semibold text-ink">{t("historyTitle")}</p>
          <p className="mt-1 text-xs text-muted">{t("historyDescription", { count: history.length })}</p>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">{t("historyEmpty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((version, index) => {
              const previous = history[index + 1];
              const changes = previous ? diffWorkflowStages(previous.stages, version.stages) : [];
              return (
                <li key={version.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-ink">v{version.version}</span>
                      <StatusPill tone={version.status === "ACTIVE" ? "positive" : "neutral"}>
                        {version.status === "ACTIVE" ? t("states.current") : t("states.previous")}
                      </StatusPill>
                      <span className="text-xs text-muted">
                        {date.format(version.createdAt * 1_000)}
                        {version.createdBy ? ` · ${version.createdBy}` : ""}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" aria-expanded={openVersion === version.id} onClick={() => setOpenVersion(openVersion === version.id ? null : version.id)}>
                      {openVersion === version.id ? t("hideStages") : t("showStages")}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {previous ? (changes.length ? changes.map(describeChange).join(" · ") : t("changes.none")) : t("changes.initial")}
                  </p>
                  {version.note && <p className="mt-1 text-xs text-faint">“{version.note}”</p>}
                  {openVersion === version.id && (
                    <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {version.stages.map((stage, position) => (
                        <li key={stage.key} className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs">
                          <p className="font-semibold text-ink">{position + 1}. {locale === "en" ? stage.labelEn : stage.labelFr}</p>
                          <p className="mt-0.5 text-muted">
                            {stage.slaHours ? t("sla", { hours: stage.slaHours }) : t("noSla")}
                            {stage.visible ? "" : ` · ${t("hidden")}`}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
