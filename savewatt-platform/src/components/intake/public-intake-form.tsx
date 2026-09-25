"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, EnvelopeSimple, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { UploadDropzone } from "@/components/upload-dropzone";

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
const ERROR_CODES = [
  "INVALID_EMAIL",
  "CONSENT_REQUIRED",
  "FILE_REQUIRED",
  "UNSUPPORTED_FILE",
  "FILE_TOO_LARGE",
  "RATE_LIMITED",
  "CHALLENGE_FAILED",
] as const;
type ErrorCode = (typeof ERROR_CODES)[number] | "generic";
const PROGRESS = ["progressReading", "progressComparing", "progressSending"] as const;

type State =
  | { kind: "idle"; error?: ErrorCode }
  | { kind: "submitting"; step: number }
  | { kind: "done"; status: "OFFER_SENT" | "NEEDS_REVIEW"; email: string };

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function PublicIntakeForm() {
  const t = useTranslations("intake.public");
  const [file, setFile] = useState<File | undefined>();
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (!turnstileSiteKey || document.querySelector("script[data-turnstile]")) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.dataset.turnstile = "true";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (state.kind !== "submitting") return;
    const timer = window.setTimeout(
      () => setState((current) => (current.kind === "submitting" ? { ...current, step: Math.min(current.step + 1, PROGRESS.length - 1) } : current)),
      12_000,
    );
    return () => window.clearTimeout(timer);
  }, [state]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setState({ kind: "idle", error: "FILE_REQUIRED" });
    const form = new FormData(event.currentTarget);
    form.set("file", file);
    const params = new URLSearchParams(window.location.search);
    for (const key of ATTRIBUTION_KEYS) {
      const value = params.get(key);
      if (value) form.set(key, value);
    }
    setState({ kind: "submitting", step: 0 });
    try {
      const response = await fetch("/api/public/intake", { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { status?: string; email?: string; error?: string };
      if (response.ok && (body.status === "OFFER_SENT" || body.status === "NEEDS_REVIEW")) {
        return setState({ kind: "done", status: body.status, email: body.email ?? String(form.get("email") ?? "") });
      }
      const code = ERROR_CODES.find((entry) => entry === body.error) ?? "generic";
      setState({ kind: "idle", error: code });
    } catch {
      setState({ kind: "idle", error: "generic" });
    }
  }

  if (state.kind === "done") {
    const sent = state.status === "OFFER_SENT";
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8" role="status">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          {sent ? <EnvelopeSimple size={24} weight="fill" /> : <CheckCircle size={24} weight="fill" />}
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-ink">
          {sent ? t("doneSentTitle") : t("doneReviewTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {sent ? t("doneSentBody", { email: state.email }) : t("doneReviewBody", { email: state.email })}
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setFile(undefined);
            setState({ kind: "idle" });
          }}
        >
          {t("again")}
        </Button>
      </div>
    );
  }

  const submitting = state.kind === "submitting";
  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-6 sm:p-8" noValidate>
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-ink">{t("formTitle")}</h2>
      <fieldset disabled={submitting} className="mt-5 grid gap-4">
        <UploadDropzone label={t("file")} file={file} onChange={setFile} />
        <p className="-mt-2 text-[12px] text-faint">{t("fileHint")}</p>
        <Field label={t("email")} hint={t("emailHint")} required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")}>
            <Input name="name" autoComplete="name" />
          </Field>
          <Field label={t("company")}>
            <Input name="company" autoComplete="organization" />
          </Field>
        </div>
        <Field label={t("phone")}>
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>
        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="flex items-start gap-3 text-[13px] leading-5 text-muted">
          <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-accent" />
          {t("consent")}
        </label>
        {turnstileSiteKey ? <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="fr" /> : null}
      </fieldset>
      {state.kind === "idle" && state.error ? (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      {submitting ? (
        <div className="mt-5 rounded-xl bg-accent-soft p-4 text-sm text-accent-ink" role="status" aria-live="polite">
          <p className="flex items-center gap-2 font-medium">
            <SpinnerGap size={18} className="animate-spin" />
            {t(PROGRESS[state.step])}
          </p>
          <p className="mt-1 text-xs leading-5">{t("progressHint")}</p>
        </div>
      ) : (
        <Button type="submit" size="lg" className="mt-6 w-full">
          {t("submit")}
        </Button>
      )}
      <p className="mt-4 text-[12px] leading-5 text-faint">{t("privacy")}</p>
    </form>
  );
}
