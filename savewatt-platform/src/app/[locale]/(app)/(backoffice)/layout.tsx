import { requirePageRole } from "@/lib/server-access";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["MASTER_ADMIN", "MASTER_BACKOFFICE"]);
  return children;
}
