import { FilePdf, LockKey, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const docs = [
  { name: "Facture EDF — août 2026.pdf", type: "Facture", state: "Reçue" },
  { name: "Proposition SaveWatt.pdf", type: "Offre", state: "Disponible" },
  { name: "Contrat signé.pdf", type: "Contrat", state: "En attente" },
];

export default function CustomerDocumentsPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Espace client" title="Vos documents" description="Consultez les documents liés à votre étude et transmettez une pièce uniquement lorsqu’elle est demandée." />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]"><section className="overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">{docs.map((doc, index) => <li key={doc.name} className="flex items-center gap-4 px-5 py-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><FilePdf size={20} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{doc.name}</strong><span className="text-xs text-muted">{doc.type}</span></span><StatusPill tone={index < 2 ? "positive" : "warning"}>{doc.state}</StatusPill></li>)}</ul></section><aside className="space-y-5"><section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center"><UploadSimple size={24} className="mx-auto text-accent" /><h2 className="mt-4 font-semibold text-ink">Ajouter une pièce</h2><p className="mt-2 text-sm leading-6 text-muted">L’envoi sera disponible lorsqu’une pièce complémentaire est demandée.</p><button disabled className="mt-5 h-10 rounded-lg bg-deep px-4 text-sm font-semibold text-white opacity-45">Aucune pièce demandée</button></section><section className="flex gap-3 rounded-2xl border border-line bg-surface p-5"><LockKey size={20} className="shrink-0 text-accent" /><p className="text-sm leading-6 text-muted">Les documents sensibles ne sont jamais envoyés par e-mail et restent accessibles uniquement dans cet espace.</p></section></aside></div>
    </div>
  );
}
