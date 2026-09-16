import { Gift, LockKey, Wallet } from "@phosphor-icons/react/dist/ssr";
import { GiftRedemptionForm } from "@/components/gifting/gift-redemption-form";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default function WalletPage() {
  const giftogramConfigured = Boolean(
    process.env.GIFTOGRAM_API_KEY && process.env.GIFTOGRAM_CAMPAIGN_ID,
  );

  return (
    <div className="rise">
      <PageHeader eyebrow="Avantages partenaires" title="Votre solde de commissions" description="Les commissions validées deviennent des crédits utilisables lorsque les règles de versement sont remplies." />
      <MetricStrip items={[
        { label: "Crédits disponibles", value: "123,08 €", tone: "positive" },
        { label: "En validation", value: "82,54 €" },
        { label: "Seuil minimum", value: "25,00 €" },
        { label: "Dernière opération", value: "15 sept." },
      ]} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section>
          <h2 className="font-semibold text-ink">Choisir un avantage</h2>
          <article className="mt-4 max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Gift size={22} />
              </span>
              <StatusPill tone={giftogramConfigured ? "positive" : "neutral"}>
                {giftogramConfigured ? "Connecté" : "Configuration requise"}
              </StatusPill>
            </div>
            <h3 className="mt-5 font-semibold text-ink">Carte cadeau multi-enseignes</h3>
            <p className="mt-1 text-sm text-muted">
              Émission sécurisée par Giftogram, à partir de 25 € de crédits disponibles.
            </p>
            <GiftRedemptionForm configured={giftogramConfigured} />
          </article>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl bg-deep p-5 text-white">
            <Wallet size={24} className="text-lime" />
            <h2 className="mt-4 text-xl font-semibold">Un registre, pas un simple solde.</h2>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Chaque crédit vient d’une commission validée et chaque émission conserve sa référence.
            </p>
          </section>
          <section className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
            <LockKey size={21} className="shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold text-ink">Débit protégé</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Une demande échouée libère automatiquement les crédits réservés. Chaque commande utilise une clé d’idempotence.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
