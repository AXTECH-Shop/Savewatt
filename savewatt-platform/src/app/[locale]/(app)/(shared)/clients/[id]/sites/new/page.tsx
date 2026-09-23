import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/workspace/page-header";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default async function NewSitePage() {
  const t = await getTranslations("clients.newSite");
  return <div className="rise mx-auto max-w-2xl"><PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} /><form className="mt-6 rounded-2xl border border-line bg-surface p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="PDL / PRM" required hint={t("pdlHint")}><Input inputMode="numeric" pattern="[0-9]{14}" maxLength={14} /></Field><Field label={t("segment")}><Select defaultValue="C4"><option>C2</option><option>C3</option><option>C4</option><option>C5</option></Select></Field><Field label={t("subscribedPower")}><Input type="number" min="0" step="0.1" /></Field><Field label={t("siteAddress")}><Input autoComplete="street-address" /></Field></div><div className="mt-6 flex justify-end"><Button type="button" disabled>{t("saveDisabled")}</Button></div></form></div>;
}
