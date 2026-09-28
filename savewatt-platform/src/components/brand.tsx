import Image from "next/image";
import { ZACK_AI_LOGO_PATHS } from "@/lib/brand-logo";
import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/zack-ai-mark.png"
      alt=""
      width={512}
      height={512}
      priority
      className={cn("h-9 w-9 rounded-[0.65rem] object-contain", className)}
    />
  );
}

/** HEY ZACK wordmark; inherits the text colour so it works on light and dark surfaces. */
export function ZackAiWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1240 228" fill="currentColor" role="img" aria-label="Zack AI" className={cn("h-5 w-auto", className)}>
      {ZACK_AI_LOGO_PATHS.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

export function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", inverse ? "text-white" : "text-ink")}>
      <BrandMark />
      <ZackAiWordmark className="h-[18px]" />
    </span>
  );
}
