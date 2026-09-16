"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, FileMagnifyingGlass, Sparkle, UploadSimple } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { useDossier, store } from "@/lib/store";
import { joshDossier } from "@/lib/demo-data";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { CurrentContract } from "@/components/current-contract";
import { ProposalBuilder } from "@/components/proposal-builder";

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const d = useDossier(id);
  const t = useTranslations("common");
  const ts = useTranslations("status");
  const tn = useTranslations("current");
  useLocale();

  if (!d) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-muted">{t("notFound")}</p>
        <Link href="/" className="mt-3 inline-block text-accent hover:underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  const ready = d.current && d.proposal;

  function loadSample() {
    const sample = joshDossier();
    store.update(id, { current: sample.current, proposal: sample.proposal, status: "analyzed" });
  }

  return (
    <div className="rise">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> {t("back")}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{d.clientName}</h1>
          <p className="nums mt-1 text-sm text-muted">
            {d.pdl ?? "—"} · {d.segment}
          </p>
        </div>
        <StatusBadge status={d.status} label={ts(d.status)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/dossiers/${id}/bills/bill-current/validate`} className="press inline-flex h-10 items-center gap-2 rounded-[0.7rem] border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">
          <FileMagnifyingGlass size={17} /> Valider la facture
        </Link>
        <Link href={`/dossiers/${id}/supplier-offer`} className="press inline-flex h-10 items-center gap-2 rounded-[0.7rem] border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">
          <UploadSimple size={17} /> Saisir l’offre fournisseur
        </Link>
      </div>

      {!ready ? (
        <Card className="mt-6">
          <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sparkle size={22} weight="fill" />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">{tn("title")}</p>
              <p className="mt-1 max-w-md text-sm text-muted">{tn("subtitle")}</p>
            </div>
            <Button onClick={loadSample}>
              <Sparkle size={17} weight="fill" />
              {ts("analyzed")}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CurrentContract current={d.current!} proposal={d.proposal} />
          <ProposalBuilder dossier={d} />
        </div>
      )}
    </div>
  );
}
