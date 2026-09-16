import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Invitation SaveWatt</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Activez votre espace</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Votre rôle et votre périmètre sont appliqués dès la création du compte.</p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-diffuse">
        <SignUp
          routing="path"
          path={`/${locale}/sign-up`}
          signInUrl={`/${locale}/sign-in`}
          fallbackRedirectUrl={`/${locale}`}
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
