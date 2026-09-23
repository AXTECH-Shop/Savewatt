import { SignOutButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  AccountAccessRepository,
  isRegistrationType,
} from "@/lib/access/account-access-repository";
import { homeForRole } from "@/lib/access-control";

export default async function AccessPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("auth.pending");
  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  const displayName = user?.fullName ?? user?.firstName ?? t("fallbackUser");
  const registrationType = user?.unsafeMetadata?.registrationType;
  const accessRepository = new AccountAccessRepository();
  const membership = await accessRepository.findOrProvisionWhitelistedMembership({
    clerkUserId: userId,
    email,
    displayName,
  });

  if (membership) {
    const internalAccessAllowed = await accessRepository.isInternalUserWhitelisted(
      email,
      membership,
    );
    if (internalAccessAllowed) redirect(`/${locale}${homeForRole(membership.role)}`);
  }

  if (email && isRegistrationType(registrationType)) {
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
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
        {isPartner ? t("partnerTitle") : t("customerTitle")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {t("description")}
      </p>
      <div className="mt-7 rounded-2xl border border-line bg-surface p-5 shadow-diffuse">
        <p className="text-sm font-semibold text-ink">{t("requestRecorded")}</p>
        <p className="mt-1 text-sm text-muted">{email || t("emailUnavailable")}</p>
        <p className="mt-4 text-xs leading-5 text-faint">
          {t("supportLead")} {" "}
          <a className="font-semibold text-accent" href="mailto:contact@savewatt.fr">
            contact@savewatt.fr
          </a>
          .
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        <Link className="font-semibold text-accent hover:text-accent-hover" href="https://savewatt.fr">
          {t("backToSaveWatt")}
        </Link>
        <SignOutButton redirectUrl={`/${locale}/sign-in`}>
          <button className="font-semibold text-muted hover:text-ink" type="button">
            {t("signOut")}
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
