import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAccessSurface } from "@/lib/access/access-surface";
import { isRegistrationType } from "@/lib/access/account-access-repository";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const surface = resolveAccessSurface((await headers()).get("host"));
  if (surface === "ADMIN") redirect(`/${locale}/sign-in`);
  const { type } = await searchParams;
  const normalizedType = type?.toUpperCase();
  const registrationType = isRegistrationType(normalizedType) ? normalizedType : null;
  const t = await getTranslations("auth.signUp");

  if (!registrationType) {
    return (
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
          {t("choiceTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("choiceDescription")}
        </p>
        <div className="mt-7 grid gap-3">
          <Link
            className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:bg-accent-soft"
            href={`/${locale}/sign-up?type=customer`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              {t("customerEyebrow")}
            </span>
            <strong className="mt-2 block text-lg text-ink">{t("customerTitle")}</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              {t("customerDescription")}
            </span>
          </Link>
          <Link
            className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:bg-accent-soft"
            href={`/${locale}/sign-up?type=partner`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              {t("partnerEyebrow")}
            </span>
            <strong className="mt-2 block text-lg text-ink">{t("partnerTitle")}</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              {t("partnerDescription")}
            </span>
          </Link>
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              {t("internalEyebrow")}
            </span>
            <strong className="mt-2 block text-base text-ink">{t("internalTitle")}</strong>
            <span className="mt-1 block text-sm leading-5 text-muted">
              {t("internalDescription")}
            </span>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {t("existingAccount")} {" "}
          <Link className="font-semibold text-accent hover:text-accent-hover" href={`/${locale}/sign-in`}>
            {t("signIn")}
          </Link>
        </p>
      </div>
    );
  }

  const accountLabel = registrationType === "CUSTOMER" ? t("customerAccountLabel") : t("partnerAccountLabel");
  return (
    <div>
      <Link className="text-sm font-medium text-muted hover:text-ink" href={`/${locale}/sign-up`}>
        ← {t("changeProfile")}
      </Link>
      <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-accent">
        Compte {accountLabel}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("createTitle")}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {t("createDescription")}
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
