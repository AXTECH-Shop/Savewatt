import { Info } from "@phosphor-icons/react/dist/ssr";

export function ConfigurationNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
      <Info size={16} weight="fill" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
