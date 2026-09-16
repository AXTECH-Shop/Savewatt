import { APP_ROLES } from "@/lib/access-control";
import { requirePageRole } from "@/lib/server-access";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole([...APP_ROLES]);
  return children;
}
