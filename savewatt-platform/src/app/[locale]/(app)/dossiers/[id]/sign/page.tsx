"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DocusealForm } from "@docuseal/react";
import {
  ArrowLeft,
  ArrowSquareOut,
  Copy,
  Check,
  CheckCircle,
  SealCheck,
  Info,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { useDossier, store } from "@/lib/store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const d = useDossier(id);
  const t = useTranslations("signature");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const [copied, setCopied] = useState(false);
  const [awaitingWebhook, setAwaitingWebhook] = useState(false);

  if (!d?.signing) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center text-muted">
        {tc("notFound")}
        <div>
          <Link href={`/dossiers/${id}`} className="mt-3 inline-block text-accent hover:underline">
            {tc("back")}
          </Link>
        </div>
      </div>
    );
  }

  const { signing } = d;
  const signed = signing.signed;

  function copy() {
    navigator.clipboard?.writeText(signing!.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  function markSigned() {
    store.update(id, { status: "signed", signing: { ...signing, signed: true } });
  }

  return (
    <div className="mx-auto max-w-xl rise">
      <Link
        href={`/dossiers/${id}/proposal`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> {tc("back")}
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <StatusBadge status={d.status} label={ts(d.status)} />
      </div>

      <Card className="mt-6">
        <CardBody className="py-8">
          {signed ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <SealCheck size={28} weight="fill" />
              </span>
              <p className="text-lg font-semibold text-ink">{t("statusSigned")}</p>
              <p className="max-w-sm text-sm text-muted">{t("done")}</p>
            </div>
          ) : signing.provider === "docuseal" ? (
            <div>
              <div className="mb-5 text-center">
                <p className="text-lg font-semibold text-ink">{t("readyTitle")}</p>
                <p className="mt-1 text-sm text-muted">{t("readyBody", { email: d.contactEmail ?? "—" })}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
                <DocusealForm
                  src={signing.url}
                  email={d.contactEmail}
                  name={d.contactName}
                  language="fr"
                  host={process.env.NEXT_PUBLIC_DOCUSEAL_EMBED_HOST}
                  backgroundColor="#FDFDFB"
                  withTitle={false}
                  onComplete={() => setAwaitingWebhook(true)}
                />
              </div>
              {awaitingWebhook && <p role="status" className="mt-4 rounded-xl bg-accent-soft p-3 text-center text-sm text-accent-ink">Signature reçue. Vérification et archivage en cours.</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <CheckCircle size={28} weight="fill" />
              </span>
              <div>
                <p className="text-lg font-semibold text-ink">{t("readyTitle")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("readyBody", { email: d.contactEmail ?? "—" })}
                </p>
              </div>

              <div className="flex w-full max-w-sm flex-col gap-2 pt-2">
                <a href={signing.url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full">
                    <ArrowSquareOut size={17} weight="bold" /> {t("openSigner")}
                  </Button>
                </a>
                <Button variant="secondary" onClick={copy} className="w-full">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t("linkCopied") : t("copyLink")}
                </Button>
                <Button variant="ghost" onClick={markSigned} className="w-full">
                  Simuler la signature
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div
        className={`mt-4 flex items-start gap-2 rounded-[0.6rem] border px-3 py-2.5 text-[13px] ${
          signing.provider === "mock"
            ? "border-warning/20 bg-warning-soft text-warning"
            : "border-accent/20 bg-accent-soft text-accent-ink"
        }`}
      >
        <Info size={15} weight="fill" className="mt-0.5 shrink-0" />
        <span>{signing.provider === "mock" ? t("mockNote") : t("liveNote")}</span>
      </div>
    </div>
  );
}
