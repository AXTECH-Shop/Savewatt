"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { StatusPill } from "@/components/workspace/status-pill";

export interface VersionHistoryColumn {
  key: string;
  label: string;
}

export type VersionState = "current" | "scheduled" | "previous";

export interface VersionHistoryRow {
  id: string;
  version: number;
  state: VersionState;
  effectiveFrom?: string | null;
  createdAt: number;
  createdBy?: string | null;
  note?: string | null;
  values: Record<string, string>;
}

const stateTone = { current: "positive", scheduled: "warning", previous: "neutral" } as const;

/**
 * Every version of a versioned setting, newest first. Each cell that changed
 * compared with the version just before it is highlighted and shows the old value.
 */
export function VersionHistory({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: VersionHistoryColumn[];
  rows: VersionHistoryRow[];
}) {
  const t = useTranslations("settings.history");
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted">{t("description", { count: rows.length })}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-faint">
              <tr>
                <th scope="col" className="px-4 py-3">{t("version")}</th>
                <th scope="col" className="px-4 py-3">{t("state")}</th>
                {rows.some((row) => row.effectiveFrom) && <th scope="col" className="px-4 py-3">{t("effectiveFrom")}</th>}
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="px-4 py-3 text-right">{column.label}</th>
                ))}
                <th scope="col" className="px-4 py-3">{t("changes")}</th>
                <th scope="col" className="px-4 py-3">{t("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, index) => {
                const previous = rows[index + 1];
                const changed = previous
                  ? columns.filter((column) => row.values[column.key] !== previous.values[column.key])
                  : [];
                return (
                  <tr key={row.id} className={cn(row.state === "current" && "bg-accent-soft/40")}>
                    <td className="px-4 py-3 font-mono text-ink">v{row.version}</td>
                    <td className="px-4 py-3"><StatusPill tone={stateTone[row.state]}>{t(`states.${row.state}`)}</StatusPill></td>
                    {rows.some((candidate) => candidate.effectiveFrom) && <td className="px-4 py-3 font-mono text-muted">{row.effectiveFrom ?? "—"}</td>}
                    {columns.map((column) => {
                      const isChanged = changed.includes(column);
                      return (
                        <td key={column.key} className={cn("px-4 py-3 text-right font-mono", isChanged ? "font-semibold text-ink" : "text-muted")}>
                          {row.values[column.key] ?? "—"}
                          {isChanged && (
                            <span className="block text-[11px] font-normal text-faint line-through">
                              {previous.values[column.key] ?? "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-xs text-muted">
                      {previous ? (changed.length ? t("changedFields", { count: changed.length }) : t("noChange")) : t("initial")}
                      {row.note && <span className="mt-0.5 block text-faint">“{row.note}”</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {row.createdAt ? date.format(row.createdAt * 1_000) : "—"}
                      {row.createdBy && <span className="block text-faint">{row.createdBy}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Classifies dated versions (newest first): the highest ACTIVE version already
 * in effect is current, future-dated ones are scheduled, the rest are previous.
 */
export function classifyDatedVersions<T extends { id: string; status: string; effectiveFrom: string; effectiveTo: string | null }>(
  versions: T[],
  today = new Date().toISOString().slice(0, 10),
): Map<string, VersionState> {
  const states = new Map<string, VersionState>();
  let currentFound = false;
  for (const version of versions) {
    if (version.status === "ACTIVE" && version.effectiveFrom > today) {
      states.set(version.id, "scheduled");
    } else if (
      !currentFound &&
      version.status === "ACTIVE" &&
      (version.effectiveTo === null || version.effectiveTo >= today)
    ) {
      states.set(version.id, "current");
      currentFound = true;
    } else {
      states.set(version.id, "previous");
    }
  }
  return states;
}
