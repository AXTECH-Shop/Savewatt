"use client";

import { useRef, useState } from "react";
import { DownloadSimple, FileArrowUp, FileText, Scan } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { StatusPill } from "@/components/workspace/status-pill";
import type { DocumentRecord, UploadableDocumentKind } from "@/lib/documents/document-types";
import type { DossierStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

interface ExtractionSummary {
  id: string;
  status: "EXTRACTED" | "VALIDATED" | "REJECTED";
  overallConfidence: number;
  warnings: string[];
}

export function DossierDocumentsPanel({
  dossierId,
  dossierStatus,
  dossierVersion,
  documents,
}: {
  dossierId: string;
  dossierStatus: DossierStatus;
  dossierVersion: number;
  documents: DocumentRecord[];
}) {
  const t = useTranslations("dossier.documents");
  const router = useRouter();
  const billInput = useRef<HTMLInputElement>(null);
  const contractInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadableDocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractions, setExtractions] = useState<Record<string, "running" | "error" | ExtractionSummary>>({});

  async function analyze(documentId: string) {
    setExtractions((current) => ({ ...current, [documentId]: "running" }));
    setError(null);
    try {
      const response = await fetch(`/api/crm/documents/${documentId}/extract`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "EXTRACTION_FAILED");
      const extraction = body.extraction as {
        id: string;
        status: ExtractionSummary["status"];
        result: { overallConfidence: number; warnings: string[] };
      };
      setExtractions((current) => ({
        ...current,
        [documentId]: {
          id: extraction.id,
          status: extraction.status,
          overallConfidence: extraction.result.overallConfidence,
          warnings: extraction.result.warnings,
        },
      }));
    } catch {
      setExtractions((current) => ({ ...current, [documentId]: "error" }));
      setError(t("analysisFailed"));
    }
  }

  async function upload(kind: UploadableDocumentKind, file?: File) {
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const response = await fetch(`/api/crm/dossiers/${dossierId}/documents`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error("UPLOAD_FAILED");
      if (kind === "BILL" && dossierStatus === "draft") {
        const statusResponse = await fetch(`/api/crm/dossiers/${dossierId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "uploaded", version: dossierVersion }),
        });
        if (!statusResponse.ok) throw new Error("STATUS_FAILED");
      }
      router.refresh();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={19} className="text-accent" /> {t("title")}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={uploading !== null}
            onClick={() => billInput.current?.click()}
          >
            <FileArrowUp size={17} />
            {uploading === "BILL" ? t("uploading") : t("addBill")}
          </Button>
          <Button
            variant="secondary"
            disabled={uploading !== null}
            onClick={() => contractInput.current?.click()}
          >
            <FileArrowUp size={17} />
            {uploading === "CURRENT_CONTRACT" ? t("uploading") : t("addContract")}
          </Button>
          <input
            ref={billInput}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => upload("BILL", event.target.files?.[0])}
          />
          <input
            ref={contractInput}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => upload("CURRENT_CONTRACT", event.target.files?.[0])}
          />
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {documents.length === 0 ? (
          <p className="mt-5 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <FileText size={19} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{document.fileName}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-faint">
                    {document.kind} · {Math.ceil(document.byteSize / 1024)} KB
                  </p>
                  {(document.kind === "BILL" || document.kind === "CURRENT_CONTRACT") && (
                    <div className="mt-1.5 flex items-center gap-2">
                      {(() => {
                        const state = extractions[document.id];
                        if (state === "running") return <span className="text-xs text-muted">{t("analyzing")}</span>;
                        if (state === "error") return <span className="text-xs text-danger">{t("analysisFailed")}</span>;
                        if (state) {
                          return (
                            <>
                              <span className="text-xs text-muted">
                                {state.status === "VALIDATED" && (
                                  <StatusPill tone="positive">{t("validated")}</StatusPill>
                                )}{" "}
                                {t("confidence", { value: Math.round(state.overallConfidence * 100) })}
                                {state.warnings.length > 0 && ` · ${t("warnings", { count: state.warnings.length })}`}
                              </span>
                              <Link
                                href={`/dossiers/${dossierId}/bills/${document.id}/validate`}
                                className="press inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent"
                              >
                                <Scan size={13} /> {t("validate")}
                              </Link>
                            </>
                          );
                        }
                        return (
                          <button
                            onClick={() => analyze(document.id)}
                            className="press inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium text-muted hover:border-accent hover:text-accent"
                          >
                            <Scan size={13} /> {t("analyze")}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <a
                  href={`/api/crm/documents/${document.id}`}
                  className="press rounded-lg border border-line p-2 text-muted hover:text-accent"
                  aria-label={t("download", { name: document.fileName })}
                >
                  <DownloadSimple size={17} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
