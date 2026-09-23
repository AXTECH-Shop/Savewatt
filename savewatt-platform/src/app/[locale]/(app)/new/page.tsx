"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "@phosphor-icons/react";
import { Link, useRouter } from "@/i18n/navigation";
import { store } from "@/lib/store";
import type { Segment } from "@/lib/types";
import type { DossierSummary } from "@/lib/crm/crm-types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/upload-dropzone";

const SEGMENTS: Segment[] = ["C2", "C3", "C4", "C5"];

export default function NewDossierPage() {
  const t = useTranslations("newDossier");
  const tc = useTranslations("common");
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [siren, setSiren] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pdl, setPdl] = useState("");
  const [segment, setSegment] = useState<Segment>("C5");
  const [contract, setContract] = useState<File | undefined>();
  const [bill, setBill] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    identifiers?: string;
    files?: string;
    submit?: string;
  }>({});

  async function submit() {
    const next: typeof errors = {};
    if (!clientName.trim()) next.name = t("errorName");
    if (!contactEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail))
      next.email = t("errorEmail");
    if ((siren && siren.replace(/\s/g, "").length !== 9) || (pdl && pdl.length !== 14)) {
      next.identifiers = t("errorIdentifiers");
    }
    if (!bill) next.files = t("errorFiles");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    let createdDossierId: string | null = null;
    try {
      if (process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true") {
        const dossier = store.create({
          clientName: clientName.trim(),
          siren: siren.replace(/\s/g, "") || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim(),
          pdl: pdl || undefined,
          segment,
          files: {
            contract: contract ? { name: contract.name, size: contract.size } : undefined,
            bill: bill ? { name: bill.name, size: bill.size } : undefined,
          },
          status: "uploaded",
        });
        router.push(`/dossiers/${dossier.id}`);
        return;
      }

      const createResponse = await fetch("/api/crm/dossiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: clientName.trim(),
          siren: siren.replace(/\s/g, "") || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim(),
          pdl: pdl || undefined,
          segment,
        }),
      });
      if (!createResponse.ok) throw new Error("DOSSIER_CREATE_FAILED");
      const { dossier } = (await createResponse.json()) as { dossier: DossierSummary };
      createdDossierId = dossier.id;

      await Promise.all([
        uploadDocument(dossier.id, "BILL", bill!),
        ...(contract ? [uploadDocument(dossier.id, "CURRENT_CONTRACT", contract)] : []),
      ]);

      const statusResponse = await fetch(`/api/crm/dossiers/${dossier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "uploaded", version: dossier.version }),
      });
      if (!statusResponse.ok) throw new Error("DOSSIER_STATUS_FAILED");
      router.push(`/dossiers/${dossier.id}`);
      router.refresh();
    } catch {
      if (createdDossierId) {
        router.push(`/dossiers/${createdDossierId}`);
        router.refresh();
        return;
      }
      setErrors((current) => ({ ...current, submit: t("submitFailed") }));
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadDocument(dossierId: string, kind: string, file: File) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const response = await fetch(`/api/crm/dossiers/${dossierId}/documents`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error("DOCUMENT_UPLOAD_FAILED");
  }

  return (
    <div className="mx-auto max-w-3xl rise">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> {tc("back")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("clientSection")}</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("clientName")} required error={errors.name}>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t("clientNamePlaceholder")}
            />
          </Field>
          <Field label={t("siren")} hint={tc("optional")}>
            <Input value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="509 847 226" />
          </Field>
          <Field label={t("contactName")} hint={tc("optional")}>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t("contactNamePlaceholder")}
            />
          </Field>
          <Field label={t("contactEmail")} required error={errors.email}>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder={t("contactEmailPlaceholder")}
            />
          </Field>
          <Field label={t("sitePdl")} hint={t("sitePdlHint")}>
            <Input
              className="nums"
              value={pdl}
              onChange={(e) => setPdl(e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="50066947359734"
              inputMode="numeric"
            />
          </Field>
          <Field label={t("segment")}>
            <Select value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          {errors.identifiers && (
            <p className="text-[12px] text-danger sm:col-span-2">{errors.identifiers}</p>
          )}
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>{t("uploadSection")}</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UploadDropzone label={t("uploadBill")} file={bill} onChange={setBill} />
          <UploadDropzone label={t("uploadContract")} file={contract} onChange={setContract} />
          {errors.files && (
            <p className="text-[12px] text-danger sm:col-span-2">{errors.files}</p>
          )}
        </CardBody>
      </Card>

      <div className="mt-6 flex justify-end gap-3">
        {errors.submit && <p className="mr-auto self-center text-[12px] text-danger">{errors.submit}</p>}
        <Link href="/">
          <Button variant="ghost">{tc("cancel")}</Button>
        </Link>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? t("creatingCta") : t("createCta")}
        </Button>
      </div>
    </div>
  );
}
