import { Desktop, DeviceMobile, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { APP_ROLES } from "@/lib/access-control";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SessionsPage() {
  await requirePageRole([...APP_ROLES]);
  return <div className="rise"><SettingsNav /><PageHeader eyebrow="Sécurité" title="Sessions actives" description="Consultez les appareils connectés à votre compte. La révocation sera fournie par Clerk en production." /><section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex items-center gap-3 border-b border-line p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Desktop size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">Chrome sur macOS</p><p className="text-xs text-muted">Paris, France · session actuelle</p></div><span className="inline-flex items-center gap-1 text-xs font-medium text-accent"><ShieldCheck size={15} /> Active</span></div><div className="flex items-center gap-3 p-5 opacity-65"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted"><DeviceMobile size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">Aucune autre session</p><p className="text-xs text-muted">Les nouveaux appareils apparaîtront ici.</p></div></div></section></div>;
}
