import {
  ArrowLeft,
  CalendarBlank,
  CheckSquare,
  ClockCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { DemoDossierPage } from "@/components/dossiers/demo-dossier-page";
import { DossierDocumentsPanel } from "@/components/dossiers/dossier-documents-panel";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ActivityRepository } from "@/lib/crm/activity-repository";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { DocumentRepository } from "@/lib/documents/document-repository";
import { resolveServerActor } from "@/lib/server-access";

export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveServerActor();
  if (actor.isPreview) return <DemoDossierPage />;

  const { id } = await params;
  const dossiers = new DossierRepository();
  const activities = new ActivityRepository();
  const documents = new DocumentRepository();
  const [dossier, events, tasks, dossierDocuments] = await Promise.all([
    dossiers.find(actor, id),
    activities.listEvents(actor, id),
    activities.listTasks(actor, id),
    documents.list(actor, id),
  ]);
  if (!dossier) notFound();

  const locale = await getLocale();
  const commonT = await getTranslations("common");
  const dossierT = await getTranslations("dossier.crm");
  const statusT = await getTranslations("status");
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="rise">
      <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> {commonT("back")}
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
            {dossierT("eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {dossier.clientName}
          </h1>
          <p className="nums mt-1 text-sm text-muted">
            {dossier.pdl ?? dossierT("noPdl")} · {dossier.segment ?? dossierT("noSegment")}
          </p>
        </div>
        <StatusBadge status={dossier.status} label={statusT(dossier.status)} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-muted">{dossierT("owner")}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{dossier.ownerName}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-muted">{dossierT("createdAt")}</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {date.format(dossier.createdAt * 1_000)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-muted">{dossierT("nextAction")}</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {dossier.nextTask ?? dossierT("noNextAction")}
            </p>
          </CardBody>
        </Card>
      </div>

      <DossierDocumentsPanel
        dossierId={dossier.id}
        dossierStatus={dossier.status}
        dossierVersion={dossier.version}
        documents={dossierDocuments}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare size={19} className="text-accent" /> {dossierT("tasks")}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted">{dossierT("noTasks")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {tasks.map((task) => (
                  <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{task.title}</p>
                        <p className="mt-1 text-xs text-muted">{task.assigneeName}</p>
                      </div>
                      <span className="rounded-full bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted">
                        {task.status}
                      </span>
                    </div>
                    {task.dueAt && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-faint">
                        <CalendarBlank size={13} /> {date.format(task.dueAt * 1_000)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockCounterClockwise size={19} className="text-accent" /> {dossierT("timeline")}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <p className="text-sm text-muted">{dossierT("noEvents")}</p>
            ) : (
              <ol className="space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-line pl-4">
                    <p className="text-sm font-medium text-ink">{event.summary}</p>
                    <p className="mt-1 text-xs text-muted">
                      {event.actorName ?? dossierT("systemActor")} · {date.format(event.createdAt * 1_000)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
