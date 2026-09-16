import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { auditEvents } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";

export default function AuditPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Traçabilité" title="Journal d’audit" description="Consultez qui a vu, créé ou modifié une information sensible sur la plateforme." action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink"><DownloadSimple size={17} /> Exporter</button>} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row"><label className="flex h-10 max-w-md flex-1 items-center gap-2 rounded-lg border border-line-strong px-3"><MagnifyingGlass size={16} className="text-faint" /><span className="sr-only">Rechercher dans le journal</span><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Acteur, dossier ou identifiant" /></label><select className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"><option>Toutes les actions</option><option>Offres</option><option>Documents</option><option>Utilisateurs</option></select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Acteur</th><th className="px-5 py-3 font-medium">Action</th><th className="px-5 py-3 font-medium">Cible</th><th className="px-5 py-3 font-medium">Trace</th></tr></thead><tbody className="divide-y divide-line">{auditEvents.map((event) => <tr key={event.trace}><td className="px-5 py-4 text-muted">{event.at}</td><td className="px-5 py-4 font-medium text-ink">{event.actor}</td><td className="px-5 py-4 text-muted">{event.action}</td><td className="px-5 py-4 text-muted">{event.target}</td><td className="px-5 py-4 font-mono text-xs text-faint">{event.trace}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
