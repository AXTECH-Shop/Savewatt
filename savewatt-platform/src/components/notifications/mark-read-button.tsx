"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface MarkReadButtonProps {
  notificationId?: string;
  all?: boolean;
}

export function MarkReadButton({ notificationId, all }: MarkReadButtonProps) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          try {
            const response = await fetch("/api/notifications/read", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(all ? { all: true } : { id: notificationId }),
            });
            if (!response.ok) throw new Error("MARK_READ_FAILED");
            router.refresh();
          } catch {
            setFailed(true);
          } finally {
            setPending(false);
          }
        }}
        className={
          all
            ? "press h-10 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink disabled:opacity-50"
            : "press text-sm font-medium text-accent hover:underline disabled:opacity-50"
        }
      >
        {pending ? "…" : all ? t("markAllRead") : t("markRead")}
      </button>
      {failed && (
        <span className="text-xs text-danger" role="alert">
          {t("actionFailed")}
        </span>
      )}
    </span>
  );
}
