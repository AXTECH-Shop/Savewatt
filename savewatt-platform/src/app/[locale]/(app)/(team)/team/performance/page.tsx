import { Medal, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { demoCopyKey, demoRoleKeys } from "@/lib/demo-copy";
import { teamMembers } from "@/lib/demo-workspace";
import { PageHeader } from "@/components/workspace/page-header";
import { MetricStrip } from "@/components/workspace/metric-strip";

export default async function TeamPerformancePage() {
  const t = await getTranslations("team.performance");
  const workspaceT = await getTranslations("workspace");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
  return (
    <div className="rise">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <MetricStrip
        items={[
          { label: t("opportunities"), value: "26" },
          { label: t("signedContracts"), value: "12" },
          {
            label: t("conversion"),
            value: `${number.format(39.6)} %`,
            tone: "positive",
          },
          { label: t("teamCommission"), value: currency.format(723.1) },
        ]}
      />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="hidden grid-cols-[auto_1.25fr_0.65fr_0.75fr_0.8fr_0.8fr] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint md:grid">
          <span>#</span>
          <span>{t("salesRepresentative")}</span>
          <span>{t("files")}</span>
          <span>{t("signed")}</span>
          <span>{t("conversion")}</span>
          <span>{t("commission")}</span>
        </div>
        <ol className="divide-y divide-line">
          {teamMembers.map((member, index) => (
            <li
              key={member.name}
              className="grid gap-3 px-5 py-5 md:grid-cols-[auto_1.25fr_0.65fr_0.75fr_0.8fr_0.8fr] md:items-center"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-semibold ${index === 0 ? "bg-lime text-deep" : "bg-surface-2 text-muted"}`}
              >
                {index === 0 ? <Medal size={17} weight="fill" /> : index + 1}
              </span>
              <span>
                <strong className="block text-sm text-ink">
                  {member.name}
                </strong>
                <span className="text-xs text-muted">
                  {workspaceT(
                    demoCopyKey(demoRoleKeys, member.role) ?? "unknownRole",
                  )}
                </span>
              </span>
              <span className="nums text-sm text-muted">{member.deals}</span>
              <span className="nums text-sm text-muted">{member.signed}</span>
              <span className="nums flex items-center gap-1.5 text-sm font-medium text-accent">
                <TrendUp size={15} />
                {number.format(member.conversion)} %
              </span>
              <span className="nums text-sm font-semibold text-ink">
                {currency.format(member.commissionEur)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
