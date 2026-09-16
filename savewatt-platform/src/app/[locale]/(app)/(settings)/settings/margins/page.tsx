import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";
import { Button } from "@/components/ui/button";

const rows = [["BASE", "4,00", "18,00"], ["HPH", "5,00", "20,00"], ["HCH", "4,00", "18,00"], ["HPE", "3,00", "16,00"], ["HCE", "3,00", "16,00"]];
export default async function MarginSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  return <div className="rise"><SettingsNav /><PageHeader eyebrow="Paramètres" title="Grille de marge" description="Encadrez la marge commerciale autorisée par cadran, sans jamais l’exposer au client." action={<Button disabled>Créer une grille</Button>} /><ConfigurationNote>Les bornes affichées sont des données de démonstration et ne déclenchent aucun calcul de paiement réel.</ConfigurationNote><section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><p className="text-sm font-semibold text-ink">Grille France métropolitaine</p><p className="mt-1 text-xs text-muted">Applicable à partir du 01/10/2026</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint"><tr><th className="px-5 py-3 text-left">Cadran</th><th className="px-5 py-3 text-right">Minimum €/MWh</th><th className="px-5 py-3 text-right">Maximum €/MWh</th><th className="px-5 py-3 text-right">Validation</th></tr></thead><tbody className="divide-y divide-line">{rows.map(([cadran, min, max]) => <tr key={cadran}><td className="px-5 py-3 font-mono font-semibold text-ink">{cadran}</td><td className="px-5 py-3 text-right font-mono text-muted">{min}</td><td className="px-5 py-3 text-right font-mono text-muted">{max}</td><td className="px-5 py-3 text-right text-xs text-accent">Automatique dans la grille</td></tr>)}</tbody></table></div></section></div>;
}
