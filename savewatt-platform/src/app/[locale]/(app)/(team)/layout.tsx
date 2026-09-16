import { requirePageRole } from "@/lib/server-access";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["TEAM_MANAGER"]);
  return children;
}
