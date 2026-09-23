import { FilePdf, LockKey, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusPill } from "@/components/workspace/status-pill";

const documents = [
  { name: "Facture EDF — août 2026.pdf", type: "bill", state: "received" },
  { name: "Proposition SaveWatt.pdf", type: "offer", state: "available" },
  { name: "Contrat signé.pdf", type: "contract", state: "pending" },
] as const;

export default async function CustomerDocumentsPage() {
  const t = await getTranslations("customer");

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("documentsTitle")} description={t("documentsDescription")} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <ul className="divide-y divide-line">
            {documents.map((document, index) => (
              <li key={document.name} className="flex items-center gap-4 px-5 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><FilePdf size={20} /></span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{document.name}</strong><span className="text-xs text-muted">{t(`documentType${document.type[0].toUpperCase()}${document.type.slice(1)}`)}</span></span>
                <StatusPill tone={index < 2 ? "positive" : "warning"}>{t(`documentState${document.state[0].toUpperCase()}${document.state.slice(1)}`)}</StatusPill>
              </li>
            ))}
          </ul>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center"><UploadSimple size={24} className="mx-auto text-accent" /><h2 className="mt-4 font-semibold text-ink">{t("addDocument")}</h2><p className="mt-2 text-sm leading-6 text-muted">{t("addDocumentDescription")}</p><button disabled className="mt-5 h-10 rounded-lg bg-deep px-4 text-sm font-semibold text-white opacity-45">{t("noDocumentRequested")}</button></section>
          <section className="flex gap-3 rounded-2xl border border-line bg-surface p-5"><LockKey size={20} className="shrink-0 text-accent" /><p className="text-sm leading-6 text-muted">{t("documentsPrivacy")}</p></section>
        </aside>
      </div>
    </div>
  );
}
