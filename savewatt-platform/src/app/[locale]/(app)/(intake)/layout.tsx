import { requirePageRole } from "@/lib/server-access";

export default async function IntakeLayout({ children }: { children: React.ReactNode }) {
  // Bill → offer exposes Symphonics buy prices: SaveWatt operators only.
  await requirePageRole(["SUPER_ADMIN"]);
  return children;
}
