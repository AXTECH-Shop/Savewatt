import { DownloadSimple, FileCsv, TrendUp } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/workspace/page-header";

const exports: { name: string; detail: string; icon: Icon }[] = [
  { name: "Écritures comptables", detail: "CSV FEC-compatible", icon: FileCsv },
  { name: "Prévision de trésorerie", detail: "CSV par date de valeur", icon: TrendUp },
  { name: "Détail des commissions", detail: "CSV par contrat et bénéficiaire", icon: DownloadSimple },
];
export default function FinanceExportsPage() {
  return <div className="rise"><PageHeader eyebrow="Finance" title="Exports comptables" description="Préparez les données de contrôle sans générer de fichier tant que la clôture n’est pas validée." /><section className="mt-6 grid gap-4 lg:grid-cols-3">{exports.map(({ name, detail, icon: Icon }) => <article key={name} className="rounded-2xl border border-line bg-surface p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted"><Icon size={20} /></span><h2 className="mt-4 text-sm font-semibold text-ink">{name}</h2><p className="mt-1 text-xs text-muted">{detail}</p><button disabled className="mt-5 text-xs font-medium text-faint">Disponible après clôture</button></article>)}</section></div>;
}
