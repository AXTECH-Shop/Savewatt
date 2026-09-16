import Image from "next/image";
import { requirePageRole } from "@/lib/server-access";
import { PageHeader } from "@/components/workspace/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ConfigurationNote } from "@/components/settings/configuration-note";

export default async function BrandingSettingsPage() {
  await requirePageRole(["SUPER_ADMIN", "MASTER_ADMIN", "SUB_REGIE_ADMIN"]);
  return <div className="rise"><SettingsNav /><PageHeader eyebrow="Paramètres" title="Identité de la régie" description="Prévisualisez l’identité appliquée au portail et aux documents client." /><ConfigurationNote>Les domaines personnalisés et l’enregistrement partagé seront activés avec le stockage persistant.</ConfigurationNote><div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><section className="rounded-2xl border border-line bg-surface p-5"><h2 className="text-sm font-semibold text-ink">Éléments de marque</h2><div className="mt-5 flex items-center gap-4 rounded-xl border border-dashed border-line-strong bg-surface-2 p-4"><Image src="/brand/savewatt-mark.png" width={56} height={56} alt="Logo SaveWatt" className="rounded-xl" /><div><p className="text-sm font-medium text-ink">Logo principal</p><p className="text-xs text-muted">PNG · 512 × 512</p></div></div><div className="mt-4 grid grid-cols-2 gap-3"><Color name="Vert profond" value="#052C24" /><Color name="Vert SaveWatt" value="#118A34" /><Color name="Signal" value="#B7F52A" /><Color name="Surface" value="#FDFDFB" /></div></section><section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="bg-deep p-6 text-white"><p className="font-mono text-xs uppercase tracking-widest text-lime">Aperçu document</p><h2 className="mt-3 text-2xl font-semibold">Votre offre d’électricité</h2><p className="mt-2 text-sm text-white/65">Une présentation claire pour décider en confiance.</p></div><div className="p-6"><p className="text-xs uppercase tracking-wider text-faint">Préparée pour</p><p className="mt-1 text-lg font-semibold text-ink">Entreprise cliente</p><div className="mt-8 border-t border-line pt-4 text-xs leading-5 text-muted">AX TECH — ECOLED WAVE CONCEPT · SAS<br />SIREN 751 982 760 · TVA FR86 751 982 760<br />8 rue Marbeau, 75016 Paris</div></div></section></div></div>;
}

function Color({ name, value }: { name: string; value: string }) {
  return <div className="rounded-xl border border-line p-3"><span className="block h-8 rounded-lg" style={{ backgroundColor: value }} /><p className="mt-2 text-xs font-medium text-ink">{name}</p><p className="font-mono text-[11px] text-faint">{value}</p></div>;
}
