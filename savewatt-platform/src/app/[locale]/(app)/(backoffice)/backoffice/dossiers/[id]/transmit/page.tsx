import { FileZip, LockKey, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { Button } from "@/components/ui/button";

export default async function TransmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="rise mx-auto max-w-3xl"><PageHeader eyebrow="Transmission fournisseur" title="Préparer le dossier" description={`Le paquet ${id} contient uniquement les pièces validées et un bordereau de transmission.`} /><section className="mt-6 rounded-2xl border border-line bg-surface p-5"><div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileZip size={24} /></span><div><h2 className="text-sm font-semibold text-ink">Paquet de transmission</h2><ul className="mt-2 space-y-1 text-xs text-muted"><li>Offre et contrat signés</li><li>Facture de référence</li><li>Justificatifs exigés par le workflow</li><li>Journal de validation</li></ul></div></div><div className="mt-5 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning"><LockKey size={16} />L’envoi fournisseur est désactivé tant que le format de dépôt et l’accusé de réception ne sont pas confirmés.</div><Button className="mt-5 w-full" disabled><PaperPlaneTilt size={17} />Transmettre</Button></section></div>;
}
