import { ArrowRight, Gift, LockKey, Wallet } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

const cards = [
  { name: "Carte multi-enseignes", provider: "GoGift", minimum: "25 €", state: "Disponible" },
  { name: "Mobilité et carburant", provider: "GoGift", minimum: "50 €", state: "Bientôt" },
  { name: "Maison et équipement", provider: "GoGift", minimum: "25 €", state: "Bientôt" },
];

export default function WalletPage() {
  return (
    <div className="rise">
      <PageHeader eyebrow="Avantages partenaires" title="Votre solde de commissions" description="Les commissions validées deviennent des crédits utilisables lorsque les règles de versement sont remplies." />
      <MetricStrip items={[
        { label: "Crédits disponibles", value: "123,08 €", tone: "positive" },
        { label: "En validation", value: "82,54 €" },
        { label: "Seuil minimum", value: "25,00 €" },
        { label: "Dernière opération", value: "15 sept." },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]"><section><h2 className="font-semibold text-ink">Choisir un avantage</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{cards.map((card, index) => <article key={card.name} className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Gift size={22} /></span><StatusPill tone={index === 0 ? "positive" : "neutral"}>{card.state}</StatusPill></div><h3 className="mt-5 font-semibold text-ink">{card.name}</h3><p className="mt-1 text-sm text-muted">Émission {card.provider} · à partir de {card.minimum}</p><button disabled={index !== 0} className="press mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-deep px-4 text-sm font-semibold text-white disabled:opacity-45">Sélectionner <ArrowRight size={16} /></button></article>)}</div></section><aside className="space-y-5"><section className="rounded-2xl bg-deep p-5 text-white"><Wallet size={24} className="text-lime" /><h2 className="mt-4 text-xl font-semibold">Un registre, pas un simple solde.</h2><p className="mt-3 text-sm leading-6 text-white/68">Chaque crédit vient d’une commission validée et chaque émission conserve sa référence.</p></section><section className="flex gap-3 rounded-2xl border border-line bg-surface p-5"><LockKey size={21} className="shrink-0 text-accent" /><div><h2 className="font-semibold text-ink">GoGift à connecter</h2><p className="mt-1 text-sm leading-6 text-muted">L’émission réelle reste désactivée tant que le compte API et la politique de vesting ne sont pas configurés.</p></div></section></aside></div>
    </div>
  );
}
