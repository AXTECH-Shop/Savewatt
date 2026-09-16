import { requirePageRole } from "@/lib/server-access";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole([
    "OPERATOR_FINANCE",
    "MASTER_ADMIN",
    "MASTER_BACKOFFICE",
    "SUB_REGIE_ADMIN",
    "TEAM_MANAGER",
    "APPORTEUR",
    "READ_ONLY",
  ]);
  return children;
}
