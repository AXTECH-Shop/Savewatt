import { BrandLockup } from "@/components/brand";
import { headers } from "next/headers";
import { resolveAccessSurface } from "@/lib/access/access-surface";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const surface = resolveAccessSurface((await headers()).get("host"));
  const isAdmin = surface === "ADMIN";

  return (
    <main className="grid min-h-[100dvh] bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-deep px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="auth-grid absolute inset-0 opacity-45" aria-hidden />
        <div className="relative">
          <BrandLockup inverse />
        </div>
        <div className="relative mt-auto max-w-xl pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-lime">
            {isAdmin ? "Administration interne" : "Espace professionnel"}
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.05em]">
            {isAdmin
              ? "Pilotez SaveWatt depuis un espace strictement réservé."
              : "Chaque dossier avance. Chaque commission reste traçable."}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/68">
            {isAdmin
              ? "Supervisez les régies, la finance, les accès et la conformité depuis l’espace opérateur."
              : "De la facture client à la signature, pilotez vos offres, votre réseau et vos échéances depuis un espace sécurisé."}
          </p>
          <div className="mt-10 grid grid-cols-3 border-y border-white/15 py-5 text-sm text-white/72">
            <span>{isAdmin ? "Régies" : "Comparaison"}</span>
            <span className="border-x border-white/15 px-5">
              {isAdmin ? "Finance" : "Signature"}
            </span>
            <span className="pl-5">{isAdmin ? "Contrôle" : "Commissions"}</span>
          </div>
        </div>
      </section>
      <section className="flex min-h-[100dvh] items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLockup />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
