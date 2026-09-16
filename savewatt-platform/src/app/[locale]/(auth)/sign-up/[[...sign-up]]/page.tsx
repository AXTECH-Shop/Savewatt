import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { isRegistrationType } from "@/lib/access/account-access-repository";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const { type } = await searchParams;
  const registrationType = isRegistrationType(type?.toUpperCase())
    ? type.toUpperCase()
    : null;

  if (!registrationType) {
    return (
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
          Créer un espace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
          Quel accès vous correspond ?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Choisissez votre profil pour démarrer avec le bon parcours.
        </p>
        <div className="mt-7 grid gap-3">
          <Link
            className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:bg-accent-soft"
            href={`/${locale}/sign-up?type=customer`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              Entreprise cliente
            </span>
            <strong className="mt-2 block text-lg text-ink">Suivre mon étude et mon contrat</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              Accédez à vos offres, signatures et documents SaveWatt.
            </span>
          </Link>
          <Link
            className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:bg-accent-soft"
            href={`/${locale}/sign-up?type=partner`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              Régie ou commercial
            </span>
            <strong className="mt-2 block text-lg text-ink">Piloter mes dossiers et commissions</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              Demandez le rattachement à votre organisation commerciale.
            </span>
          </Link>
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              Équipe interne SaveWatt
            </span>
            <strong className="mt-2 block text-base text-ink">Accès sur invitation uniquement</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              Les comptes internes sont créés et autorisés par un administrateur SaveWatt.
            </span>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Vous avez déjà un compte ?{" "}
          <Link className="font-semibold text-accent hover:text-accent-hover" href={`/${locale}/sign-in`}>
            Se connecter
          </Link>
        </p>
      </div>
    );
  }

  const accountLabel = registrationType === "CUSTOMER" ? "entreprise cliente" : "partenaire";
  return (
    <div>
      <Link className="text-sm font-medium text-muted hover:text-ink" href={`/${locale}/sign-up`}>
        ← Changer de profil
      </Link>
      <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-accent">
        Compte {accountLabel}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Créez votre espace</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Une fois votre adresse vérifiée, nous rattacherons votre compte au bon périmètre.
      </p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-diffuse">
        <SignUp
          routing="path"
          path={`/${locale}/sign-up`}
          signInUrl={`/${locale}/sign-in`}
          forceRedirectUrl={`/${locale}/access-pending`}
          unsafeMetadata={{ registrationType }}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full border-0 shadow-none",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              formButtonPrimary: "bg-accent hover:bg-accent-hover text-white",
              footerActionLink: "text-accent hover:text-accent-hover",
            },
          }}
        />
      </div>
    </div>
  );
}
