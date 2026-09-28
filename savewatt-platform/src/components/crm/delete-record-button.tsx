"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SpinnerGap, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

const BLOCKERS = ["SIGNED", "COMMISSIONS", "CONVERTING"] as const;

/**
 * Confirms, then DELETEs `endpoint`. On success either navigates to
 * `redirectTo` or reloads the current page.
 */
export function DeleteRecordButton({
  endpoint,
  name,
  converted,
  redirectTo,
}: {
  endpoint: string;
  name: string;
  converted: boolean;
  redirectTo?: string;
}) {
  const t = useTranslations("crmDelete");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string; field?: string } | null;
        const blocker = BLOCKERS.find((code) => code === body?.field);
        setError(
          blocker
            ? t(`blocked.${blocker}`)
            : response.status === 403
              ? t("forbidden")
              : t("failed", { code: body?.error ?? String(response.status) }),
        );
        return;
      }
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        window.location.reload();
      }
    } catch {
      setError(t("failed", { code: "NETWORK" }));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="press inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:underline"
        aria-label={t("actionFor", { name })}
      >
        <Trash size={15} />
        {t("action")}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep/45 p-4 sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-record-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-left shadow-diffuse">
            <div className="flex items-start justify-between gap-4">
              <h2 id="delete-record-title" className="text-lg font-semibold text-ink">
                {t("title", { name })}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="press rounded-lg p-2 text-muted hover:bg-surface-2"
                aria-label={t("cancel")}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{converted ? t("bodyConverted") : t("body")}</p>
            <p className="mt-2 text-sm font-medium text-danger">{t("irreversible")}</p>
            {error ? (
              <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button variant="danger" onClick={confirm} disabled={pending}>
                {pending ? <SpinnerGap size={16} className="animate-spin" /> : <Trash size={16} />}
                {t("confirm")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
