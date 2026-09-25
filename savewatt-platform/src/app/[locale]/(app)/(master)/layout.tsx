import { requirePageRole } from "@/lib/server-access";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  return children;
}
