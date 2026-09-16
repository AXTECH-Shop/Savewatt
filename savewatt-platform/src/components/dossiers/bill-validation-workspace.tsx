"use client";

import { useMemo, useState } from "react";
import { CheckCircle, FilePdf, Warning } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { store, useDossier } from "@/lib/store";
import { joshDossier } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export function BillValidationWorkspace({ dossierId, billId }: { dossierId: string; billId: string }) {
  const dossier = useDossier(dossierId);
  const router = useRouter();
  const sample = useMemo(() => joshDossier(), []);
  const source = dossier?.current ?? sample.current!;
  const [supplier, setSupplier] = useState(source.supplier);
  const [offerName, setOfferName] = useState(source.offerName);
  const [pdl, setPdl] = useState(dossier?.pdl ?? sample.pdl ?? "");
  const [endDate, setEndDate] = useState(source.endDate ?? "");
  const [subscription, setSubscription] = useState(String(source.subscriptionEurMonth));
  const [power, setPower] = useState(String(source.subscribedPowerKva ?? ""));
  const [error, setError] = useState("");

  if (!dossier) return <p className="py-20 text-center text-muted">Dossier introuvable.</p>;

  function save() {
    const subscriptionValue = Number(subscription.replace(",", "."));
    const powerValue = Number(power.replace(",", "."));
    if (!supplier.trim() || !/^\d{14}$/.test(pdl) || !Number.isFinite(subscriptionValue)) {
      setError("Vérifiez le fournisseur, le PDL à 14 chiffres et le montant d’abonnement.");
      return;
    }
    store.update(dossierId, {
      pdl,
      current: {
        ...source,
        supplier: supplier.trim(),
        offerName: offerName.trim(),
        endDate: endDate || null,
        subscriptionEurMonth: subscriptionValue,
        subscribedPowerKva: Number.isFinite(powerValue) ? powerValue : null,
      },
      status: "analyzed",
    });
    router.push(`/dossiers/${dossierId}`);
  }

  return <div className="rise"><header className="border-b border-line pb-6"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Facture {billId}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">Valider les données extraites</h1><p className="mt-2 max-w-2xl text-sm text-muted">Comparez le document et les champs. Corrigez uniquement ce qui diffère de la facture.</p></header>
    <div className="mt-6 grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(23rem,0.85fr)]"><section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-[#525659]"><div className="flex items-center justify-between bg-[#36383b] px-4 py-3 text-xs text-white/75"><span className="inline-flex items-center gap-2"><FilePdf size={16} /> {dossier.files.bill?.name ?? "Facture importée"}</span><span>Page 1 / 1</span></div><div className="flex flex-1 items-center justify-center p-6 text-center"><div className="max-w-sm rounded-xl bg-white p-8 shadow-xl"><FilePdf size={36} className="mx-auto text-accent" /><p className="mt-4 text-sm font-semibold text-ink">Aperçu du PDF indisponible dans cette démo</p><p className="mt-2 text-xs leading-5 text-muted">Le fichier réel sera chargé depuis R2 après activation du stockage. Aucun faux document n’est affiché.</p></div></div></section>
      <section className="rounded-2xl border border-line bg-surface p-5"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-ink">Champs du contrat</h2><p className="mt-1 text-xs text-muted">Confiance globale 92 %</p></div><span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"><CheckCircle size={14} weight="fill" /> À contrôler</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><ConfidenceField label="Fournisseur" confidence={99}><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></ConfidenceField><ConfidenceField label="Offre" confidence={84} warning><Input value={offerName} onChange={(e) => setOfferName(e.target.value)} /></ConfidenceField><ConfidenceField label="PDL / PRM" confidence={98}><Input inputMode="numeric" maxLength={14} value={pdl} onChange={(e) => setPdl(e.target.value.replace(/\D/g, ""))} /></ConfidenceField><ConfidenceField label="Fin du contrat" confidence={72} warning><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></ConfidenceField><ConfidenceField label="Abonnement mensuel HT" confidence={96}><Input inputMode="decimal" value={subscription} onChange={(e) => setSubscription(e.target.value)} /></ConfidenceField><ConfidenceField label="Puissance souscrite (kVA)" confidence={88}><Input inputMode="decimal" value={power} onChange={(e) => setPower(e.target.value)} /></ConfidenceField></div><Field label="Structure tarifaire" hint="Modifiable si le cadran détecté ne correspond pas à la facture."><Select defaultValue="4_CADRANS"><option value="BASE">Base</option><option value="HP_HC">HP / HC</option><option value="4_CADRANS">4 cadrans</option></Select></Field>{error && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-danger-soft p-3 text-xs text-danger"><Warning size={16} weight="fill" />{error}</div>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => router.push(`/dossiers/${dossierId}`)}>Annuler</Button><Button onClick={save}>Valider et continuer</Button></div></section></div></div>;
}

function ConfidenceField({ label, confidence, warning, children }: { label: string; confidence: number; warning?: boolean; children: React.ReactNode }) {
  return <Field label={label} hint={<span className={warning ? "text-warning" : "text-accent"}>{warning ? "Contrôle conseillé" : "Confiance élevée"} · {confidence} %</span>}>{children}</Field>;
}
