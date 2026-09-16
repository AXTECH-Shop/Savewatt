import { PageHeader } from "@/components/workspace/page-header";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function NewSitePage() {
  return <div className="rise mx-auto max-w-2xl"><PageHeader eyebrow="Client" title="Ajouter un site" description="Renseignez le point de livraison et ses caractéristiques électriques." /><form className="mt-6 rounded-2xl border border-line bg-surface p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="PDL / PRM" required hint="14 chiffres"><Input inputMode="numeric" pattern="[0-9]{14}" maxLength={14} /></Field><Field label="Segment"><Select defaultValue="C4"><option>C2</option><option>C3</option><option>C4</option><option>C5</option></Select></Field><Field label="Puissance souscrite (kVA)"><Input type="number" min="0" step="0.1" /></Field><Field label="Adresse du site"><Input autoComplete="street-address" /></Field></div><div className="mt-6 flex justify-end"><Button type="button" disabled>Enregistrer après activation de la base</Button></div></form></div>;
}
