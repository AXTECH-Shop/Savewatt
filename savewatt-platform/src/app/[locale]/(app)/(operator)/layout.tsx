import { requirePageRole } from "@/lib/server-access";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["SUPER_ADMIN"]);
  return children;
}
