import { requirePageRole } from "@/lib/server-access";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["CLIENT"]);
  return children;
}
