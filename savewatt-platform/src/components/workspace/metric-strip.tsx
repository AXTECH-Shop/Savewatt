import { cn } from "@/lib/cn";

export interface MetricItem {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "positive" | "warning";
}

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <dl className="mt-6 grid divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-5 py-4">
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{item.label}</dt>
          <dd
            className={cn(
              "nums mt-2 text-2xl font-semibold tracking-[-0.035em]",
              item.tone === "positive" && "text-accent",
              item.tone === "warning" && "text-warning",
              (!item.tone || item.tone === "default") && "text-ink",
            )}
          >
            {item.value}
          </dd>
          {item.detail && <p className="mt-1 text-xs text-muted">{item.detail}</p>}
        </div>
      ))}
    </dl>
  );
}
