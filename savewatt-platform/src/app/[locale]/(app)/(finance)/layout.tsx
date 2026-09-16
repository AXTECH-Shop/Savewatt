import { requirePageRole } from "@/lib/server-access";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["OPERATOR_FINANCE"]);
  return children;
}
