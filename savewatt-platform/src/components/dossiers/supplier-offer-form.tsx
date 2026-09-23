"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileCsv, Info } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { store, useDossier } from "@/lib/store";
import type { Cadran, ProposedLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

const cadrans: Cadran[] = ["HPH", "HCH", "HPE", "HCE"];

export function SupplierOfferForm({ dossierId }: { dossierId: string }) {
  const t = useTranslations("supplierOffer");
  const dossier = useDossier(dossierId);
  const router = useRouter();
  const existing = dossier?.proposal;
  const [cee, setCee] = useState(String(existing?.ceeEurMwh ?? 3));
  const [capacity, setCapacity] = useState(
    String(existing?.capacityEurMwh ?? 2),
  );
  const [subscription, setSubscription] = useState(
    String(existing?.subscriptionEurMonth ?? 30),
  );
  const [margin, setMargin] = useState(String(existing?.marginEurMwh ?? 10));
  const [validUntil, setValidUntil] = useState(existing?.validUntil ?? "");
  const [termYears, setTermYears] = useState(String(existing?.termYears ?? 3));
  const [lines, setLines] = useState<ProposedLine[]>(
    existing?.lines ??
      cadrans.map((cadran, index) => ({
        cadran,
        electronEurMwh: 90 + index * 3,
        annualVolumeMwh: 10,
      })),
  );
  const [error, setError] = useState("");

  if (!dossier)
    return <p className="py-20 text-center text-muted">{t("notFound")}</p>;

  function updateLine(
    index: number,
    key: "electronEurMwh" | "annualVolumeMwh",
    value: string,
  ) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, [key]: Number(value.replace(",", ".")) }
          : line,
      ),
    );
  }

  function save() {
    const numeric = [cee, capacity, subscription, margin, termYears].map(
      (value) => Number(value.replace(",", ".")),
    );
    if (
      numeric.some((value) => !Number.isFinite(value) || value < 0) ||
      lines.some(
        (line) =>
          !Number.isFinite(line.electronEurMwh) ||
          !Number.isFinite(line.annualVolumeMwh),
      )
    ) {
      setError(t("validationError"));
      return;
    }
    store.update(dossierId, {
      proposal: {
        supplier: "Symphonics",
        ceeEurMwh: numeric[0],
        capacityEurMwh: numeric[1],
        subscriptionEurMonth: numeric[2],
        marginEurMwh: numeric[3],
        validUntil: validUntil || null,
        termYears: numeric[4],
        lines,
      },
      status: "proposalReady",
    });
    router.push(`/dossiers/${dossierId}`);
  }

  return (
    <div className="rise mx-auto max-w-5xl">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t("description")}</p>
      </header>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_18rem]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("supplier")}>
              <Input value="Symphonics" readOnly />
            </Field>
            <Field label={t("validUntil")}>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Field>
            <Field label={t("term")}>
              <Select
                value={termYears}
                onChange={(e) => setTermYears(e.target.value)}
              >
                {[1, 2, 3, 4].map((years) => (
                  <option key={years} value={years}>
                    {t("termYears", { count: years })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("ceePrice")}>
              <Input
                inputMode="decimal"
                value={cee}
                onChange={(e) => setCee(e.target.value)}
              />
            </Field>
            <Field label={t("capacityPrice")}>
              <Input
                inputMode="decimal"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </Field>
            <Field label={t("subscriptionPrice")}>
              <Input
                inputMode="decimal"
                value={subscription}
                onChange={(e) => setSubscription(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-6 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-3 text-left">{t("band")}</th>
                  <th className="px-4 py-3 text-right">{t("electronPrice")}</th>
                  <th className="px-4 py-3 text-right">{t("annualVolume")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line, index) => (
                  <tr key={line.cadran}>
                    <td className="px-4 py-3 font-mono font-semibold text-ink">
                      {line.cadran}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        className="ml-auto max-w-36 text-right font-mono"
                        value={String(line.electronEurMwh)}
                        onChange={(e) =>
                          updateLine(index, "electronEurMwh", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        className="ml-auto max-w-36 text-right font-mono"
                        value={String(line.annualVolumeMwh)}
                        onChange={(e) =>
                          updateLine(index, "annualVolumeMwh", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={save}>{t("save")}</Button>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <FileCsv size={24} className="text-accent" />
            <h2 className="mt-3 text-sm font-semibold text-ink">
              {t("csvImport")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              {t("csvDisabled")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              disabled
            >
              {t("import")}
            </Button>
          </div>
          <div className="rounded-2xl border border-accent/20 bg-accent-soft p-4 text-xs leading-5 text-accent-ink">
            <Info size={16} weight="fill" className="mb-2" />
            {t("internalMarginNotice")}
          </div>
          <Field label={t("commercialMargin")} hint={t("authorisedRolesOnly")}>
            <Input
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </Field>
        </aside>
      </div>
    </div>
  );
}
