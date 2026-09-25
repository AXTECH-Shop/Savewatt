import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChartLineDown, FileArrowUp, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { PublicIntakeForm } from "@/components/intake/public-intake-form";
import { isLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "intake.public" });
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function PublicOfferPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("intake.public");
  const steps = [
    { icon: FileArrowUp, title: t("step1Title"), body: t("step1Body") },
    { icon: MagnifyingGlass, title: t("step2Title"), body: t("step2Body") },
    { icon: ChartLineDown, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="rise grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-14">
      <section className="lg:pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted">{t("subtitle")}</p>
      </section>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <PublicIntakeForm />
      </div>
      <section>
        <ol className="grid gap-5">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon size={22} />
              </span>
              <div>
                <p className="font-semibold text-ink">
                  <span className="nums mr-2 font-mono text-xs text-faint">0{index + 1}</span>
                  {title}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-lg rounded-xl border border-line bg-surface-2 p-4 text-sm leading-6 text-muted">
          {t("notSupplier")}
        </p>
      </section>
    </div>
  );
}
