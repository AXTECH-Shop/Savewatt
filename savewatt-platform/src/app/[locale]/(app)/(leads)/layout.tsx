import { requirePageRole } from "@/lib/server-access";

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["MASTER_ADMIN", "SUB_REGIE_ADMIN", "TEAM_MANAGER", "APPORTEUR", "READ_ONLY"]);
  return children;
}
