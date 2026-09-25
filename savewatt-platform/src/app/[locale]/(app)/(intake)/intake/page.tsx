import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { IntakeUploadForm } from "@/components/intake/intake-upload-form";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";
import { Link } from "@/i18n/navigation";
import { IntakeManager, type IntakeStatus } from "@/lib/intake/intake-manager";
import { resolveServerActor } from "@/lib/server-access";

const TONES: Record<IntakeStatus, "neutral" | "positive" | "warning" | "danger"> = {
  RECEIVED: "neutral",
  ANALYZED: "neutral",
  OFFER_READY: "warning",
  OFFER_SENT: "positive",
  NEEDS_REVIEW: "warning",
  FAILED: "danger",
};

export default async function IntakePage() {
  const t = await getTranslations("intake.admin");
  const tr = await getTranslations("intake.reference");
  const locale = await getLocale();
  const actor = await resolveServerActor();
  const submissions = actor.isPreview ? [] : await new IntakeManager().list(actor);
  const host = (await headers()).get("host") ?? "app.savewatt.fr";
  const publicLink = `https://${host}/fr/offre?utm_source=ads&utm_campaign=`;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-4 font-semibold text-ink">{t("listTitle")}</h2>
          {submissions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("date")}</th>
                    <th className="px-4 py-3 font-medium">{t("client")}</th>
                    <th className="px-4 py-3 font-medium">{t("contact")}</th>
                    <th className="px-4 py-3 font-medium">{t("channelLabel")}</th>
                    <th className="px-4 py-3 font-medium">{t("statusLabel")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="nums whitespace-nowrap px-4 py-3 text-muted">
                        {date.format(new Date(submission.createdAt * 1000))}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {submission.clientName ?? submission.contact.company ?? t("unknownClient")}
                        {submission.issues.length ? (
                          <p className="mt-0.5 text-xs font-normal text-warning">{t(`issues.${submission.issues[0]}`)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">{submission.contact.email ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{t(`channel.${submission.channel}`)}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={TONES[submission.status]}>{t(`status.${submission.status}`)}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/intake/${submission.id}`} className="font-medium text-accent hover:underline">
                          {t("open")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <IntakeUploadForm />
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">{t("publicLink")}</h2>
            <p className="mt-2 break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-ink">{publicLink}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{t("publicLinkHint")}</p>
          </section>
          <Link
            href="/settings/symphonics"
            className="block rounded-2xl border border-line bg-surface p-5 text-sm font-medium text-accent hover:bg-surface-2"
          >
            {tr("title")} →
          </Link>
        </aside>
      </div>
    </div>
  );
}
