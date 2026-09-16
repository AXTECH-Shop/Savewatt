import { FilePdf, PenNib, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { StatusPill } from "@/components/workspace/status-pill";

const templates = [
  { name: "Offre commerciale", detail: "Comparatif et prix client", state: "Active", icon: FilePdf },
  { name: "Contrat de fourniture", detail: "Préparé pour DocuSeal", state: "À configurer", icon: PenNib },
  { name: "Attestation de signature", detail: "Archive et journal de preuve", state: "Automatique", icon: SealCheck },
];
export default async function TemplateSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  return <div className="rise"><SettingsNav /><PageHeader eyebrow="Paramètres" title="Modèles documentaires" description="Maîtrisez les documents générés et les variables disponibles sans exposer les données de marge." /><section className="mt-6 grid gap-4 lg:grid-cols-3">{templates.map(({ name, detail, state, icon: Icon }) => <article key={name} className="rounded-2xl border border-line bg-surface p-5"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span><StatusPill tone={state === "À configurer" ? "warning" : "positive"}>{state}</StatusPill></div><h2 className="mt-5 text-base font-semibold text-ink">{name}</h2><p className="mt-1 text-sm text-muted">{detail}</p><button className="press mt-5 text-sm font-medium text-accent">Ouvrir le modèle</button></article>)}</section></div>;
}
