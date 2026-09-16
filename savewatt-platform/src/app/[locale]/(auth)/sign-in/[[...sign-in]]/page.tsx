import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Connexion sécurisée</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Retrouvez votre activité</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Accédez uniquement aux dossiers et équipes rattachés à votre organisation.</p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-diffuse">
        <SignIn
          routing="path"
          path={`/${locale}/sign-in`}
          signUpUrl={`/${locale}/sign-up`}
          fallbackRedirectUrl={`/${locale}`}
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
            },
          }}
        />
      </div>
    </div>
  );
}
