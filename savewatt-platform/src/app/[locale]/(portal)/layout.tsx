import { BrandLockup } from "@/components/brand";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-bg"><header className="border-b border-line bg-surface"><div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6"><BrandLockup /></div></header><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">{children}</main></div>;
}
