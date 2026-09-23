"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { ExtractionResult } from "@/lib/extraction/schema";

interface ConsumptionLineState {
  cadran: string;
  volumeKwh: string;
  unitPriceEurMwh: string;
}

export function ExtractionValidationForm({
  dossierId,
  dossierVersion,
  extractionId,
  bill,
  warnings,
}: {
  dossierId: string;
  dossierVersion: number;
  extractionId: string;
  bill: ExtractionResult["bill"];
  warnings: string[];
}) {
  const t = useTranslations("extractionValidation");
  const router = useRouter();
  const [supplier, setSupplier] = useState(bill.supplier ?? "");
  const [offerName, setOfferName] = useState(bill.offerName ?? "");
  const [optionTarifaire, setOptionTarifaire] = useState<string>(bill.optionTarifaire ?? "4_CADRANS");
  const [pdl, setPdl] = useState(bill.pdlOrPrm ?? "");
  const [endDate, setEndDate] = useState(bill.contractEndDate ?? "");
  const [subscription, setSubscription] = useState(
    bill.subscriptionEurPerMonth !== null ? String(bill.subscriptionEurPerMonth) : "",
  );
  const [power, setPower] = useState(bill.subscribedPowerKva !== null ? String(bill.subscribedPowerKva) : "");
  const [segment, setSegment] = useState(bill.segment ?? "");
  const [lines, setLines] = useState<ConsumptionLineState[]>(
    bill.consumption.map((line) => ({
      cadran: line.cadran,
      volumeKwh: line.volumeKwh !== null ? String(line.volumeKwh) : "",
      unitPriceEurMwh: line.unitPriceEurMwh !== null ? String(line.unitPriceEurMwh) : "",
    })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const subscriptionValue = Number(subscription.replace(",", "."));
    const powerValue = power ? Number(power.replace(",", ".")) : null;
    if (!supplier.trim() || !/^\d{14}$/.test(pdl) || !Number.isFinite(subscriptionValue)) {
      setError(t("validationError"));
      return;
    }
    setPending(true);
    setError(null);
    const validated = {
      bill: {
        ...bill,
        supplier: supplier.trim(),
        offerName: offerName.trim(),
        optionTarifaire,
        pdlOrPrm: pdl,
        contractEndDate: endDate || null,
        subscriptionEurPerMonth: subscriptionValue,
        subscribedPowerKva: powerValue,
        segment: segment || null,
        consumption: lines.map((line) => ({
          cadran: line.cadran as ExtractionResult["bill"]["consumption"][number]["cadran"],
          volumeKwh: line.volumeKwh ? Number(line.volumeKwh.replace(",", ".")) : null,
          unitPricePrinted: null,
          unitPricePrintedUnit: null,
          unitPriceEurMwh: line.unitPriceEurMwh ? Number(line.unitPriceEurMwh.replace(",", ".")) : null,
          periodStart: null,
          periodEnd: null,
          indexStart: null,
          indexEnd: null,
        })),
      },
    };
    try {
      const response = await fetch(`/api/crm/extractions/${extractionId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!response.ok) throw new Error("VALIDATION_FAILED");
      const statusResponse = await fetch(`/api/crm/dossiers/${dossierId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "analyzed", version: dossierVersion }),
      });
      if (!statusResponse.ok) throw new Error("STATUS_FAILED");
      router.push(`/dossiers/${dossierId}`);
      router.refresh();
    } catch {
      setError(t("saveError"));
      setPending(false);
    }
  }

  return (
    <div className="rise">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t("description")}</p>
      </header>

      {warnings.length > 0 && (
        <div role="alert" className="mt-6 flex gap-2 rounded-xl bg-warning-soft p-4 text-sm text-warning">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
          <ul className="list-inside list-disc space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">{t("fieldsTitle")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("supplier")}>
            <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} />
          </Field>
          <Field label={t("offer")}>
            <Input value={offerName} onChange={(event) => setOfferName(event.target.value)} />
          </Field>
          <Field label={t("tariffStructure")}>
            <Select value={optionTarifaire} onChange={(event) => setOptionTarifaire(event.target.value)}>
              <option value="BASE">Base</option>
              <option value="HP/HC">HP / HC</option>
              <option value="4_CADRANS">{t("fourBands")}</option>
              <option value="TEMPO">Tempo</option>
              <option value="EJP">EJP</option>
              <option value="OTHER">{t("other")}</option>
            </Select>
          </Field>
          <Field label="PDL / PRM">
            <Input inputMode="numeric" maxLength={14} value={pdl} onChange={(event) => setPdl(event.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label={t("endDate")}>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
          <Field label={t("monthlySubscription")}>
            <Input inputMode="decimal" value={subscription} onChange={(event) => setSubscription(event.target.value)} />
          </Field>
          <Field label={t("subscribedPower")}>
            <Input inputMode="decimal" value={power} onChange={(event) => setPower(event.target.value)} />
          </Field>
          <Field label={t("segment")}>
            <Select value={segment} onChange={(event) => setSegment(event.target.value)}>
              <option value="">—</option>
              <option value="C2">C2</option>
              <option value="C3">C3</option>
              <option value="C4">C4</option>
              <option value="C5">C5</option>
            </Select>
          </Field>
        </div>

        {lines.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink">{t("consumptionTitle")}</h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-line">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint">
                    <th className="px-3 py-2 font-medium">{t("cadran")}</th>
                    <th className="px-3 py-2 font-medium">{t("volumeKwh")}</th>
                    <th className="px-3 py-2 font-medium">{t("unitPrice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={`${line.cadran}-${index}`} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs text-muted">{line.cadran}</td>
                      <td className="px-3 py-2">
                        <Input
                          inputMode="decimal"
                          value={line.volumeKwh}
                          onChange={(event) =>
                            setLines((current) => current.map((item, i) => (i === index ? { ...item, volumeKwh: event.target.value } : item)))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          inputMode="decimal"
                          value={line.unitPriceEurMwh}
                          onChange={(event) =>
                            setLines((current) => current.map((item, i) => (i === index ? { ...item, unitPriceEurMwh: event.target.value } : item)))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-danger-soft p-3 text-xs text-danger">
            <Warning size={16} weight="fill" /> {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push(`/dossiers/${dossierId}`)}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </section>
    </div>
  );
}
