import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ADMIN_ORIGIN,
  APP_ORIGIN,
  resolveAccessSurface,
} from "@/lib/access/access-surface";
import { isRegistrationType } from "@/lib/access/account-access-repository";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const surface = resolveAccessSurface((await headers()).get("host"));
  const { type } = await searchParams;
  const normalizedType = type?.toUpperCase();
  const loginType = isRegistrationType(normalizedType) ? normalizedType : null;
  const isAdmin = surface === "ADMIN";

  if (!isAdmin && !loginType) {
    return (
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
          Connexion SaveWatt
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
          Quel espace souhaitez-vous ouvrir ?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Votre profil détermine le parcours affiché après connexion.
        </p>
        <div className="mt-7 grid gap-3">
          <Link
            className="rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:bg-accent-soft"
            href={`/${locale}/sign-in?type=partner`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              Partenaire
            </span>
            <strong className="mt-2 block text-lg text-ink">Régie ou commercial</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              Dossiers, équipe, offres et commissions.
            </span>
          </Link>
          <Link
            className="rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:bg-accent-soft"
            href={`/${locale}/sign-in?type=customer`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              Client
            </span>
            <strong className="mt-2 block text-lg text-ink">Entreprise cliente</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              Étude, proposition, signature et documents.
            </span>
          </Link>
        </div>
        <p className="mt-6 text-center text-xs leading-5 text-faint">
          Équipe SaveWatt ?{" "}
          <Link className="font-semibold text-muted hover:text-ink" href={`${ADMIN_ORIGIN}/${locale}/sign-in`}>
            Accéder à l’administration
          </Link>
        </p>
      </div>
    );
  }

  const accountLabel = isAdmin
    ? "équipe interne"
    : loginType === "PARTNER"
      ? "partenaire"
      : "client";
  const origin = isAdmin ? ADMIN_ORIGIN : APP_ORIGIN;

  return (
    <div>
      {!isAdmin && (
        <Link className="text-sm font-medium text-muted hover:text-ink" href={`/${locale}/sign-in`}>
          ← Changer d’espace
        </Link>
      )}
      <p className={`${isAdmin ? "" : "mt-5 "}font-mono text-xs uppercase tracking-[0.16em] text-accent`}>
        Connexion {accountLabel}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
        {isAdmin ? "Administration SaveWatt" : "Retrouvez votre activité"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {isAdmin
          ? "Accès réservé aux comptes internes autorisés par SaveWatt."
          : "Accédez uniquement aux dossiers rattachés à votre organisation."}
      </p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-diffuse">
        <SignIn
          routing="path"
          path={`/${locale}/sign-in`}
          signUpUrl={isAdmin ? undefined : `/${locale}/sign-up?type=${loginType?.toLowerCase()}`}
          withSignUp={!isAdmin}
          forceRedirectUrl={`${origin}/${locale}`}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full border-0 shadow-none",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "border-line-strong",
              formButtonPrimary: "bg-accent hover:bg-accent-hover text-white",
              footerActionLink: "text-accent hover:text-accent-hover",
              footerAction: isAdmin ? "hidden" : undefined,
            },
          }}
        />
      </div>
    </div>
  );
}
