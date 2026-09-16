import { ArrowDown, CheckCircle, Clock, FileText, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";
import { Button } from "@/components/ui/button";

const steps = [
  { name: "Qualification", rule: "Facture et contact signataire requis", sla: "24 h", icon: FileText },
  { name: "Validation offre", rule: "Marge dans la grille et offre valide", sla: "8 h", icon: CheckCircle },
  { name: "Signature", rule: "Contrat validé par le back-office", sla: "72 h", icon: PaperPlaneTilt },
];

export default async function WorkflowSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  return <div className="rise"><SettingsNav /><PageHeader eyebrow="Paramètres" title="Workflow commercial" description="Les étapes visibles par vos équipes et les contrôles nécessaires avant passage à l’étape suivante." action={<Button disabled>Nouvelle version</Button>} />
    <ConfigurationNote>Version de travail locale. La publication partagée sera activée après le choix de la base de données.</ConfigurationNote>
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="font-semibold text-ink">Parcours électricité B2B</p><p className="mt-1 text-xs text-muted">Version 3 · brouillon</p></div><span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">Non publiée</span></div>
      <ol className="space-y-2">{steps.map(({ name, rule, sla, icon: Icon }, index) => <li key={name}><div className="grid gap-3 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span><div><p className="text-sm font-semibold text-ink">{index + 1}. {name}</p><p className="mt-0.5 text-xs text-muted">{rule}</p></div><span className="inline-flex items-center gap-1 font-mono text-xs text-faint"><Clock size={14} /> SLA {sla}</span></div>{index < steps.length - 1 && <ArrowDown size={16} className="mx-auto my-1 text-faint" />}</li>)}</ol>
    </section></div>;
}
