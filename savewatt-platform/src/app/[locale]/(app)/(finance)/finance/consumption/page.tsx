import { FileCsv, LockKey } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { Button } from "@/components/ui/button";

export default function ConsumptionImportPage() {
  return <div className="rise"><PageHeader eyebrow="Finance" title="Import des consommations" description="Prévisualisez le fichier mensuel avant toute écriture dans la clôture." /><section className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileCsv size={24} /></span><h2 className="mt-4 text-base font-semibold text-ink">Déposez le fichier fournisseur</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">CSV UTF-8 uniquement. Les colonnes contrat, période, volume et montant seront contrôlées avant aperçu.</p><Button className="mt-5" disabled>Choisir un fichier</Button><p className="mt-4 inline-flex items-center gap-1 text-xs text-faint"><LockKey size={14} /> Import désactivé jusqu’à validation du format Symphonics.</p></section></div>;
}
