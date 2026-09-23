"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  FileMagnifyingGlass,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { joshDossier } from "@/lib/demo-data";
import { store, useDossier } from "@/lib/store";
import { CurrentContract } from "@/components/current-contract";
import { ProposalBuilder } from "@/components/proposal-builder";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export function DemoDossierPage() {
  const { id } = useParams<{ id: string }>();
  const dossier = useDossier(id);
  const commonT = useTranslations("common");
  const dossierT = useTranslations("dossier");
  const statusT = useTranslations("status");
  const currentT = useTranslations("current");

  if (!dossier) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-muted">{commonT("notFound")}</p>
        <Link href="/" className="mt-3 inline-block text-accent hover:underline">
          {commonT("back")}
        </Link>
      </div>
    );
  }

  const ready = dossier.current && dossier.proposal;

  function loadSample() {
    const sample = joshDossier();
    store.update(id, {
      current: sample.current,
      proposal: sample.proposal,
      status: "analyzed",
    });
  }

  return (
    <div className="rise">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> {commonT("back")}
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{dossier.clientName}</h1>
          <p className="nums mt-1 text-sm text-muted">
            {dossier.pdl ?? "—"} · {dossier.segment}
          </p>
        </div>
        <StatusBadge status={dossier.status} label={statusT(dossier.status)} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/dossiers/${id}/bills/bill-current/validate`} className="press inline-flex h-10 items-center gap-2 rounded-[0.7rem] border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">
          <FileMagnifyingGlass size={17} /> {dossierT("validateBill")}
        </Link>
        <Link href={`/dossiers/${id}/supplier-offer`} className="press inline-flex h-10 items-center gap-2 rounded-[0.7rem] border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">
          <UploadSimple size={17} /> {dossierT("enterSupplierOffer")}
        </Link>
      </div>
      {!ready ? (
        <Card className="mt-6">
          <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sparkle size={22} weight="fill" />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">{currentT("title")}</p>
              <p className="mt-1 max-w-md text-sm text-muted">{currentT("subtitle")}</p>
            </div>
            <Button onClick={loadSample}>
              <Sparkle size={17} weight="fill" />
              {statusT("analyzed")}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CurrentContract current={dossier.current!} proposal={dossier.proposal} />
          <ProposalBuilder dossier={dossier} />
        </div>
      )}
    </div>
  );
}
