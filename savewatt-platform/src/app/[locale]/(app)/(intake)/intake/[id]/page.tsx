import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { IntakeReview } from "@/components/intake/intake-review";
import { PageHeader } from "@/components/workspace/page-header";
import { Link } from "@/i18n/navigation";
import { IntakeManager } from "@/lib/intake/intake-manager";
import { resolveServerActor } from "@/lib/server-access";

export default async function IntakeReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveServerActor();
  if (actor.isPreview) notFound();
  const manager = new IntakeManager();
  if (!(await manager.find(actor, id))) notFound();
  const draft = await manager.draft(actor, id);
  const t = await getTranslations("intake");
  const title = draft.submission.clientName ?? draft.submission.contact.company ?? t("admin.unknownClient");

  return (
    <div className="rise">
      <Link href="/intake" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} />
        {t("review.back")}
      </Link>
      <PageHeader
        eyebrow={t("review.receivedFrom", { channel: t(`admin.channel.${draft.submission.channel}`) })}
        title={title}
        description={[draft.submission.contact.name, draft.submission.contact.email, draft.submission.contact.phone]
          .filter(Boolean)
          .join(" · ") || t(`admin.status.${draft.submission.status}`)}
        action={
          <div className="flex gap-3 text-sm">
            {draft.submission.documentId ? (
              <a href={`/api/crm/documents/${draft.submission.documentId}`} className="font-medium text-accent hover:underline">
                {t("review.sourceBill")}
              </a>
            ) : null}
            {draft.submission.dossierId ? (
              <Link href={`/dossiers/${draft.submission.dossierId}`} className="font-medium text-accent hover:underline">
                {t("review.openDossier")}
              </Link>
            ) : null}
          </div>
        }
      />
      <IntakeReview draft={draft} />
    </div>
  );
}
