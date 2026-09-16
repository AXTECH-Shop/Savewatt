import { EnvelopeSimple, Plus, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";
import { teamMembers } from "@/lib/demo-workspace";

export default function UsersPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Accès et rôles" title="Utilisateurs de la branche" description="Invitez une personne dans un périmètre précis et attribuez uniquement les droits nécessaires." action={<button className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"><Plus size={16} /> Inviter</button>} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="hidden grid-cols-[1.2fr_0.75fr_0.8fr_0.6fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint sm:grid"><span>Utilisateur</span><span>Rôle</span><span>Périmètre</span><span>Statut</span></div><ul className="divide-y divide-line">{teamMembers.map((member, index) => <li key={member.name} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_0.75fr_0.8fr_0.6fr] sm:items-center"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-deep font-mono text-xs font-semibold text-lime">{member.name.split(" ").map((part) => part[0]).join("")}</span><span><strong className="block text-sm text-ink">{member.name}</strong><span className="text-xs text-muted">{member.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(" ", ".")}@savewatt.fr</span></span></span><span className="text-sm text-muted">{member.role}</span><span className="text-sm text-muted">Équipe Paris Ouest</span><span><StatusPill tone={index === 3 ? "warning" : "positive"}>{index === 3 ? "Invitation" : "Actif"}</StatusPill></span></li>)}</ul></section>
        <aside className="space-y-5"><section className="rounded-2xl border border-line bg-surface p-5"><ShieldCheck size={24} className="text-accent" /><h2 className="mt-4 font-semibold text-ink">Droits bornés par le parent</h2><p className="mt-2 text-sm leading-6 text-muted">Un rôle personnalisé ne peut jamais dépasser les droits ou la grille de sa branche parente.</p></section><section className="rounded-2xl border border-line bg-surface p-5"><EnvelopeSimple size={24} className="text-accent" /><h2 className="mt-4 font-semibold text-ink">Invitation sécurisée</h2><p className="mt-2 text-sm leading-6 text-muted">Clerk gère l’activation, les sessions et l’authentification forte. L’organisation est ajoutée après acceptation.</p></section></aside>
      </div>
    </div>
  );
}
