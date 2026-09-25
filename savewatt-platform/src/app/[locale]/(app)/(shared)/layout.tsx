import { requirePageRole } from "@/lib/server-access";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["MASTER_ADMIN", "SUB_REGIE_ADMIN", "APPORTEUR"]);
  return children;
}
