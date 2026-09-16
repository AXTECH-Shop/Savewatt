import { CheckCircle, FileText, IdentificationCard, Signature, Warning } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { demoDeals } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const checks = [["Facture récente", "Lisible et PDL cohérent", true, FileText], ["Identité entreprise", "SIREN à rapprocher du KBIS", false, IdentificationCard], ["Pouvoir du signataire", "Représentant légal ou délégation", false, Signature]] as const;
export default async function BackofficeDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = demoDeals.find((item) => item.id === id) ?? demoDeals[0];
  return <div className="rise"><PageHeader eyebrow="Back-office" title={deal.client} description={`Contrôle documentaire · PDL ${deal.pdl}`} action={<StatusPill tone="warning">2 contrôles requis</StatusPill>} /><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_20rem]"><section className="overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">{checks.map(([name, detail, done, Icon]) => <li key={name} className="flex items-start gap-3 p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${done ? "bg-accent-soft text-accent" : "bg-warning-soft text-warning"}`}><Icon size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{name}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>{done ? <CheckCircle size={20} weight="fill" className="text-accent" /> : <Warning size={20} weight="fill" className="text-warning" />}</li>)}</ul></section><aside className="rounded-2xl border border-line bg-surface p-5"><h2 className="text-sm font-semibold text-ink">Décision</h2><p className="mt-2 text-xs leading-5 text-muted">La transmission reste bloquée jusqu’à résolution des contrôles ouverts.</p><Link href={`/backoffice/dossiers/${id}/transmit`} className="press mt-5 inline-flex h-10 w-full items-center justify-center rounded-[0.7rem] bg-accent px-4 text-sm font-medium text-white">Préparer la transmission</Link></aside></div></div>;
}
