import { cn } from "@/lib/cn";
import type { DossierStatus } from "@/lib/types";

const styles: Record<DossierStatus, string> = {
  draft: "bg-surface-2 text-muted border-line-strong",
  uploaded: "bg-surface-2 text-ink border-line-strong",
  analyzed: "bg-accent-soft text-accent-ink border-accent/20",
  proposalReady: "bg-accent-soft text-accent-ink border-accent/30",
  sent: "bg-warning-soft text-warning border-warning/20",
  signed: "bg-accent text-white border-transparent",
  lost: "bg-danger-soft text-danger border-danger/20",
};

export function StatusBadge({ status, label }: { status: DossierStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
        styles[status],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "signed" ? "bg-white" : "bg-current opacity-70",
        )}
      />
      {label}
    </span>
  );
}
