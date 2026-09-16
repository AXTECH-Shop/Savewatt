import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { Button } from "@/components/ui/button";

const tiers = [["AX TECH", "33 % de M", "Part opérateur"], ["Régie maître", "33 % de M", "Enveloppe réseau"], ["Sous-régie", "Configurable", "Prélevé sur l’enveloppe maître"], ["Équipe / apporteur", "Configurable", "Solde de cascade"]];
export default async function CommissionSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  return <div className="rise"><SettingsNav /><PageHeader eyebrow="Paramètres" title="Cascade de commissions" description="Configurez la distribution de l’enveloppe réseau sans dépasser le montant disponible." action={<Button disabled>Modifier la grille</Button>} /><MetricStrip items={[{ label: "Part réseau", value: "66 % de M", tone: "positive" }, { label: "AX TECH", value: "50 % réseau" }, { label: "Régie maître", value: "50 % réseau" }]} /><div className="mt-5"><ConfigurationNote>La règle 66 % puis 50/50 est verrouillée. Les niveaux descendants restent en lecture seule jusqu’à validation des valeurs contractuelles.</ConfigurationNote></div><section className="overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">{tiers.map(([name, share, note], index) => <li key={name} className="grid gap-2 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-deep font-mono text-xs font-bold text-lime">{index + 1}</span><div><p className="text-sm font-semibold text-ink">{name}</p><p className="text-xs text-muted">{note}</p></div><span className="font-mono text-sm font-semibold text-ink">{share}</span></li>)}</ul></section></div>;
}
