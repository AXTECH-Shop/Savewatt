import { SignOutButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AccountAccessRepository,
  isRegistrationType,
} from "@/lib/access/account-access-repository";
import { homeForRole } from "@/lib/access-control";
import {
  ADMIN_ORIGIN,
  APP_ORIGIN,
  isInternalRole,
  resolveAccessSurface,
} from "@/lib/access/access-surface";

export default async function AccessPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const surface = resolveAccessSurface((await headers()).get("host"));
  const isAdmin = surface === "ADMIN";
  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  const displayName = user?.fullName ?? user?.firstName ?? "Utilisateur SaveWatt";
  const registrationType = user?.unsafeMetadata?.registrationType;
  const accessRepository = new AccountAccessRepository();
  const membership = await accessRepository.findActiveMembership(userId);

  if (membership) {
    const internalAccessAllowed = await accessRepository.isInternalUserWhitelisted(
      email,
      membership,
    );
    if (internalAccessAllowed) {
      const targetOrigin = isInternalRole(membership.role) ? ADMIN_ORIGIN : APP_ORIGIN;
      redirect(`${targetOrigin}/${locale}${homeForRole(membership.role)}`);
    }
  }

  if (!isAdmin && email && isRegistrationType(registrationType)) {
    await accessRepository.recordPendingRegistration({
      clerkUserId: userId,
      email,
      displayName,
      registrationType,
    });
  }

  const isPartner = registrationType === "PARTNER";

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
        {isAdmin ? "Accès interne" : "Compte créé"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
        {isAdmin
          ? "Ce compte n’est pas encore autorisé."
          : isPartner
            ? "Nous rattachons votre espace partenaire."
            : "Nous préparons votre espace client."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {isAdmin
          ? "Un administrateur SaveWatt doit ajouter cette adresse à la liste interne et lui attribuer un rôle avant toute connexion."
          : "Votre adresse est vérifiée. L’accès au tableau de bord sera ouvert dès que votre organisation et votre périmètre auront été confirmés."}
      </p>
      <div className="mt-7 rounded-2xl border border-line bg-surface p-5 shadow-diffuse">
        <p className="text-sm font-semibold text-ink">
          {isAdmin ? "Autorisation requise" : "Demande enregistrée"}
        </p>
        <p className="mt-1 text-sm text-muted">{email || "Adresse e-mail indisponible"}</p>
        <p className="mt-4 text-xs leading-5 text-faint">
          Besoin d’aide ? Écrivez à{" "}
          <a className="font-semibold text-accent" href="mailto:contact@savewatt.fr">
            contact@savewatt.fr
          </a>
          .
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        <Link className="font-semibold text-accent hover:text-accent-hover" href="https://savewatt.fr">
          Retour à SaveWatt
        </Link>
        <SignOutButton redirectUrl={`/${locale}/sign-in`}>
          <button className="font-semibold text-muted hover:text-ink" type="button">
            Se déconnecter
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
