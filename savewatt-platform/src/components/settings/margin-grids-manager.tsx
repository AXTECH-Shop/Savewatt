"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { MarginGridRecord, MarginGridRoleScope } from "@/lib/offers/offer-types";

interface MarginGridsManagerProps {
  organizationId: string;
  grids: MarginGridRecord[];
  preview: boolean;
}

const SCOPES: MarginGridRoleScope[] = ["ADMIN", "REGIE"];

export function MarginGridsManager({ organizationId, grids, preview }: MarginGridsManagerProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeFor = (scope: MarginGridRoleScope) =>
    grids.find((grid) => grid.roleScope === scope && grid.status === "ACTIVE") ?? null;

  async function submit(formData: FormData) {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/margin-grids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleScope: formData.get("roleScope"),
          minMarginEurMwh: Number(formData.get("minMarginEurMwh")),
          defaultMarginEurMwh: Number(formData.get("defaultMarginEurMwh")),
          maxMarginEurMwh: Number(formData.get("maxMarginEurMwh")),
          effectiveFrom: formData.get("effectiveFrom") || undefined,
        }),
      });
      const result = (await response.json()) as { marginGrid?: MarginGridRecord; error?: string };
      if (!response.ok) throw new Error(result.error ?? "MARGIN_GRID_SAVE_FAILED");
      setFeedback(t("gridSaved", { version: result.marginGrid?.version ?? 0 }));
      router.refresh();
    } catch (error) {
      setFeedback(t("gridSaveFailed", { code: error instanceof Error ? error.message : "UNKNOWN" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {SCOPES.map((scope) => {
        const active = activeFor(scope);
        return (
          <section key={scope} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <p className="text-sm font-semibold text-ink">{t(scope === "ADMIN" ? "adminGrid" : "regieGrid")}</p>
              <p className="mt-1 text-xs text-muted">
                {active
                  ? t("gridVersionActive", { version: active.version, date: active.effectiveFrom })
                  : t("noGridYet")}
              </p>
            </div>
            {active && (
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                  <tr>
                    <th className="px-5 py-3 text-right">{t("minimumPerMwh")}</th>
                    <th className="px-5 py-3 text-right">{t("defaultPerMwh")}</th>
                    <th className="px-5 py-3 text-right">{t("maximumPerMwh")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-5 py-3 text-right font-mono text-muted">{active.minMarginEurMwh.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-muted">{active.defaultMarginEurMwh.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-muted">{active.maxMarginEurMwh.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink">{t("createGrid")}</p>
        <p className="mt-1 text-xs text-muted">{t("regieGridCapNote")}</p>
        <form action={submit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("gridRoleScope")} required>
            <Select name="roleScope" required disabled={preview || submitting} defaultValue="ADMIN">
              <option value="ADMIN">ADMIN</option>
              <option value="REGIE">REGIE</option>
            </Select>
          </Field>
          <Field label={t("minimumPerMwh")} required>
            <Input name="minMarginEurMwh" type="number" step="0.01" min="0" required disabled={preview || submitting} />
          </Field>
          <Field label={t("defaultPerMwh")} required>
            <Input name="defaultMarginEurMwh" type="number" step="0.01" min="0" required disabled={preview || submitting} />
          </Field>
          <Field label={t("maximumPerMwh")} required>
            <Input name="maxMarginEurMwh" type="number" step="0.01" min="0" required disabled={preview || submitting} />
          </Field>
          <Field label={t("effectiveFrom")} hint={t("effectiveFromHint")}>
            <Input name="effectiveFrom" type="date" disabled={preview || submitting} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={preview || submitting}>
              {submitting ? t("saving") : t("saveNewVersion")}
            </Button>
          </div>
        </form>
        {feedback && <p className="mt-3 text-xs text-muted">{feedback}</p>}
      </section>
    </div>
  );
}
