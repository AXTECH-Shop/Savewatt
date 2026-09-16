import Image from "next/image";
import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/savewatt-mark.png"
      alt=""
      width={512}
      height={512}
      priority
      className={cn("h-9 w-9 rounded-[0.65rem] object-contain", className)}
    />
  );
}

export function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span
        className={cn(
          "text-lg font-semibold tracking-[-0.04em]",
          inverse ? "text-white" : "text-ink",
        )}
      >
        Save<span className="text-accent-bright">Watt</span>
      </span>
    </span>
  );
}
