import { ArrowLeft, FilePdf, LockKey } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PortalOfferState } from "@/components/portal/portal-offer-state";
import { Link } from "@/i18n/navigation";
import { resolvePortalOffer } from "@/lib/portal/portal-offer-loader";

export default async function PortalDocumentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolution = await resolvePortalOffer(token);
  if (resolution.kind !== "ready") return <PortalOfferState state={resolution} />;
  const { offer } = resolution;

  const t = await getTranslations("portal.docs");
  const documents = [
    offer.documents.marketing
      ? {
          href: `/portal/offer/${token}/docs/marketing`,
          title: t("marketingPdfTitle"),
          description: t("marketingPdfDescription"),
        }
      : null,
    offer.documents.budget
      ? {
          href: `/portal/offer/${token}/docs/budget`,
          title: t("budgetPdfTitle"),
          description: t("budgetPdfDescription"),
        }
      : null,
  ].filter((document) => document !== null);

  return (
    <div className="rise mx-auto max-w-2xl">
      <Link
        href={`/portal/offer/${token}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> {t("backToOffer")}
      </Link>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-accent">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>

      {documents.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {documents.map((document) => (
            <section
              key={document.href}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <FilePdf size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{document.title}</p>
                <p className="mt-1 text-xs leading-5 text-faint">{document.description}</p>
              </div>
              <Link
                href={document.href}
                prefetch={false}
                className="press inline-flex h-10 shrink-0 items-center rounded-xl bg-accent px-4 text-sm font-medium text-white"
              >
                {t("downloadCta")}
              </Link>
            </section>
          ))}
        </div>
      ) : (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
          <FilePdf size={32} className="mx-auto text-accent" />
          <p className="mt-3 text-sm font-semibold text-ink">{t("emptyTitle")}</p>
          <p className="mt-2 text-xs text-faint">{t("emptySecurityNote")}</p>
        </section>
      )}

      <p className="mt-6 inline-flex items-center gap-1 text-xs text-faint">
        <LockKey size={14} />
        {t("securityNote")}
      </p>
      <div>
        <Link
          href={`/portal/offer/${token}/sign`}
          className="press mt-4 inline-flex h-10 items-center rounded-xl bg-deep px-5 text-sm font-medium text-white"
        >
          {t("signCta")}
        </Link>
      </div>
    </div>
  );
}
