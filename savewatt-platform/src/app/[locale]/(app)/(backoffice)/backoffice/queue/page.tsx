import { ArrowRight, FileMagnifyingGlass, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { demoActionKeys, demoCopyKey } from "@/lib/demo-copy";
import { demoDeals } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";
import { StatusPill } from "@/components/workspace/status-pill";

export default async function ValidationQueuePage() {
  const t = await getTranslations("backoffice");
  const tw = await getTranslations("workspace");
  const queue = demoDeals.filter((deal) => ["analyzed", "proposalReady", "signed"].includes(deal.status));

  return (
    <div className="rise">
      <PageHeader eyebrow={t("eyebrow")} title={t("validationQueue")} description={t("validationQueueDescription")} />
      <MetricStrip items={[
        { label: t("toValidate"), value: "" + queue.length, tone: "warning" },
        { label: t("extraction"), value: "1" },
        { label: t("offer"), value: "2" },
        { label: t("postSignature"), value: "1", tone: "positive" },
      ]} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {queue.map((deal) => (
            <li key={deal.id}>
              <Link href={`/backoffice/dossiers/${deal.id}`} className="press grid gap-4 px-5 py-5 hover:bg-surface-2 lg:grid-cols-[auto_1.2fr_0.8fr_0.9fr_0.8fr_auto] lg:items-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  {deal.status === "signed" ? <SealCheck size={20} /> : <FileMagnifyingGlass size={20} />}
                </span>
                <span><strong className="block text-sm text-ink">{deal.client}</strong><span className="font-mono text-xs text-muted">{deal.pdl}</span></span>
                <span className="text-sm text-muted">{deal.owner}</span>
                <span className="text-sm text-muted">{tw(demoCopyKey(demoActionKeys, deal.nextAction) ?? "unknownAction")}</span>
                <span><StatusPill tone={deal.status === "signed" ? "positive" : "warning"}>{deal.status === "signed" ? t("contractSigned") : t("checkRequired")}</StatusPill></span>
                <ArrowRight size={18} className="text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
