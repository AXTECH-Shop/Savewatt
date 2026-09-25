"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useRouter } from "@/i18n/navigation";

export function IntakeUploadForm() {
  const t = useTranslations("intake.admin");
  const router = useRouter();
  const [file, setFile] = useState<File | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("file");
    const form = new FormData(event.currentTarget);
    form.set("file", file);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/intake", { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as {
        submission?: { id: string };
        error?: string;
        field?: string;
      };
      if (!response.ok || !body.submission) throw new Error(body.field ?? body.error ?? String(response.status));
      router.push(`/intake/${body.submission.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold text-ink">{t("uploadTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{t("uploadBody")}</p>
      <fieldset disabled={busy} className="mt-4 grid gap-3">
        <UploadDropzone label={t("file")} file={file} onChange={setFile} />
        <Field label={t("contactEmail")}>
          <Input name="email" type="email" />
        </Field>
        <Field label={t("contactName")}>
          <Input name="name" />
        </Field>
        <Field label={t("phone")}>
          <Input name="phone" type="tel" />
        </Field>
      </fieldset>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
      <Button type="submit" className="mt-4 w-full" disabled={busy}>
        {busy ? <SpinnerGap size={16} className="animate-spin" /> : null}
        {busy ? t("analyzing") : t("analyze")}
      </Button>
    </form>
  );
}
