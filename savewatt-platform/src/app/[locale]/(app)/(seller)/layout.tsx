import { requirePageRole } from "@/lib/server-access";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["APPORTEUR"]);
  return children;
}
