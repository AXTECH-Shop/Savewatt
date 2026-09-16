"use client";

import { useState } from "react";
import { FileCsv, Info } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { store, useDossier } from "@/lib/store";
import type { Cadran, ProposedLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

const cadrans: Cadran[] = ["HPH", "HCH", "HPE", "HCE"];

export function SupplierOfferForm({ dossierId }: { dossierId: string }) {
  const dossier = useDossier(dossierId);
  const router = useRouter();
  const existing = dossier?.proposal;
  const [cee, setCee] = useState(String(existing?.ceeEurMwh ?? 3));
  const [capacity, setCapacity] = useState(String(existing?.capacityEurMwh ?? 2));
  const [subscription, setSubscription] = useState(String(existing?.subscriptionEurMonth ?? 30));
  const [margin, setMargin] = useState(String(existing?.marginEurMwh ?? 10));
  const [validUntil, setValidUntil] = useState(existing?.validUntil ?? "");
  const [termYears, setTermYears] = useState(String(existing?.termYears ?? 3));
  const [lines, setLines] = useState<ProposedLine[]>(existing?.lines ?? cadrans.map((cadran, index) => ({ cadran, electronEurMwh: 90 + index * 3, annualVolumeMwh: 10 })));
  const [error, setError] = useState("");

  if (!dossier) return <p className="py-20 text-center text-muted">Dossier introuvable.</p>;

  function updateLine(index: number, key: "electronEurMwh" | "annualVolumeMwh", value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: Number(value.replace(",", ".")) } : line));
  }

  function save() {
    const numeric = [cee, capacity, subscription, margin, termYears].map((value) => Number(value.replace(",", ".")));
    if (numeric.some((value) => !Number.isFinite(value) || value < 0) || lines.some((line) => !Number.isFinite(line.electronEurMwh) || !Number.isFinite(line.annualVolumeMwh))) {
      setError("Tous les montants et volumes doivent être des nombres positifs.");
      return;
    }
    store.update(dossierId, { proposal: { supplier: "Symphonics", ceeEurMwh: numeric[0], capacityEurMwh: numeric[1], subscriptionEurMonth: numeric[2], marginEurMwh: numeric[3], validUntil: validUntil || null, termYears: numeric[4], lines }, status: "proposalReady" });
    router.push(`/dossiers/${dossierId}`);
  }

  return <div className="rise mx-auto max-w-5xl"><header className="border-b border-line pb-6"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Offre fournisseur</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">Saisir la proposition reçue</h1><p className="mt-2 max-w-2xl text-sm text-muted">Recopiez les valeurs de la grille fournisseur. SaveWatt ajoutera la marge et générera le comparatif client.</p></header><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_18rem]"><section className="rounded-2xl border border-line bg-surface p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Fournisseur"><Input value="Symphonics" readOnly /></Field><Field label="Valable jusqu’au"><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field><Field label="Durée"><Select value={termYears} onChange={(e) => setTermYears(e.target.value)}><option value="1">1 an</option><option value="2">2 ans</option><option value="3">3 ans</option><option value="4">4 ans</option></Select></Field><Field label="CEE €/MWh"><Input inputMode="decimal" value={cee} onChange={(e) => setCee(e.target.value)} /></Field><Field label="Capacité €/MWh"><Input inputMode="decimal" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field><Field label="Abonnement €/mois"><Input inputMode="decimal" value={subscription} onChange={(e) => setSubscription(e.target.value)} /></Field></div><div className="mt-6 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[520px] text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint"><tr><th className="px-4 py-3 text-left">Cadran</th><th className="px-4 py-3 text-right">Électron €/MWh</th><th className="px-4 py-3 text-right">Volume annuel MWh</th></tr></thead><tbody className="divide-y divide-line">{lines.map((line, index) => <tr key={line.cadran}><td className="px-4 py-3 font-mono font-semibold text-ink">{line.cadran}</td><td className="px-4 py-2"><Input className="ml-auto max-w-36 text-right font-mono" value={String(line.electronEurMwh)} onChange={(e) => updateLine(index, "electronEurMwh", e.target.value)} /></td><td className="px-4 py-2"><Input className="ml-auto max-w-36 text-right font-mono" value={String(line.annualVolumeMwh)} onChange={(e) => updateLine(index, "annualVolumeMwh", e.target.value)} /></td></tr>)}</tbody></table></div>{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-end"><Button onClick={save}>Enregistrer l’offre</Button></div></section><aside className="space-y-4"><div className="rounded-2xl border border-line bg-surface p-5"><FileCsv size={24} className="text-accent" /><h2 className="mt-3 text-sm font-semibold text-ink">Import CSV</h2><p className="mt-1 text-xs leading-5 text-muted">Le connecteur reste désactivé tant que le format fournisseur définitif n’est pas validé.</p><Button variant="secondary" size="sm" className="mt-4 w-full" disabled>Importer</Button></div><div className="rounded-2xl border border-accent/20 bg-accent-soft p-4 text-xs leading-5 text-accent-ink"><Info size={16} weight="fill" className="mb-2" />La marge SaveWatt n’apparaît jamais dans les documents client.</div><Field label="Marge commerciale €/MWh" hint="Visible uniquement par les rôles autorisés."><Input inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} /></Field></aside></div></div>;
}
