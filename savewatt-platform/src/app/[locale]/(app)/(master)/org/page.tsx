import { Buildings, Plus, TreeStructure, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { demoOrganizations } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const typeLabel = { OPERATOR: "Opérateur", MASTER: "Régie master", SUB_REGIE: "Sous-régie", TEAM: "Équipe" };

export default function OrganizationPage() {
  const branch = demoOrganizations.filter((org) => org.path.startsWith("axtech.ile_de_france"));
  return (
    <div className="rise">
      <PageHeader eyebrow="Organisation" title="Votre réseau commercial" description="Ajoutez des sous-régies et des équipes dans votre propre branche. Chaque niveau ne voit que son périmètre." action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Plus size={16} /> Ajouter un niveau</button>} />
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-line pb-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-deep text-lime"><Buildings size={22} /></span><div><h2 className="font-semibold text-ink">Régie Île-de-France</h2><p className="font-mono text-xs text-muted">axtech.ile_de_france</p></div><span className="ml-auto"><StatusPill tone="positive">Active</StatusPill></span></div>
        <ul className="mt-5 space-y-3">{branch.filter((org) => org.id !== "idf").map((org) => { const depth = org.path.split(".").length - 2; return <li key={org.id} className="relative" style={{ marginLeft: `${Math.min(depth, 2) * 24}px` }}><span className="absolute -left-4 top-0 h-1/2 w-3 rounded-bl-lg border-b border-l border-line-strong" aria-hidden /><div className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">{org.type === "TEAM" ? <UsersThree size={18} /> : <TreeStructure size={18} />}</span><span><strong className="block text-sm text-ink">{org.name}</strong><span className="text-xs text-muted">{typeLabel[org.type]}</span></span></span><span className="text-sm text-muted"><strong className="nums text-ink">{org.activeMembers}</strong> membres</span><span className="text-sm text-muted"><strong className="nums text-ink">{org.openDeals}</strong> dossiers</span></div></li>; })}</ul>
      </section>
    </div>
  );
}
