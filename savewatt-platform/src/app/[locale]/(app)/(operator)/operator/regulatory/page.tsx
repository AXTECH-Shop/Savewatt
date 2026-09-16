import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const params = [["Accise", "20,50 €/MWh", "01/02/2026"], ["CTA", "21,93 %", "01/08/2026"], ["TVA énergie", "20,00 %", "01/01/2026"], ["TURPE 7", "Version HTA-BT", "01/08/2025"]];
export default function RegulatoryPage() {
  return <div className="rise"><PageHeader eyebrow="Opérateur" title="Paramètres réglementaires" description="Référentiel daté utilisé pour contrôler les composantes réglementées des comparatifs." /><section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><table className="w-full text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint"><tr><th className="px-5 py-3 text-left">Paramètre</th><th className="px-5 py-3 text-left">Valeur</th><th className="px-5 py-3 text-left">Effet</th><th className="px-5 py-3 text-right">État</th></tr></thead><tbody className="divide-y divide-line">{params.map(([name, value, date]) => <tr key={name}><td className="px-5 py-4 font-medium text-ink">{name}</td><td className="px-5 py-4 font-mono text-muted">{value}</td><td className="px-5 py-4 text-muted">{date}</td><td className="px-5 py-4 text-right"><StatusPill tone="positive">Active</StatusPill></td></tr>)}</tbody></table></section></div>;
}
