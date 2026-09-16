import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const control =
  "h-10 w-full rounded-[0.6rem] border border-line-strong bg-surface px-3 text-sm text-ink " +
  "placeholder:text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 " +
  "transition-colors";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}
