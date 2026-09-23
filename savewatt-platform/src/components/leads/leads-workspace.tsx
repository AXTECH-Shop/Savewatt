"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FileArrowUp, Plus, Download, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/workspace/status-pill";
import { cn } from "@/lib/cn";
import type { LeadRecord, LeadStatus } from "@/lib/crm/crm-types";

const LEAD_STATUSES: LeadStatus[] = ["NEW", "QUALIFIED", "CONVERTING", "CONVERTED", "LOST"];

const STATUS_TONES: Record<LeadStatus, "neutral" | "positive" | "warning" | "danger"> = {
  NEW: "neutral",
  QUALIFIED: "warning",
  CONVERTING: "warning",
  CONVERTED: "positive",
  LOST: "danger",
};

interface ImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  replayed: boolean;
  rows: ImportRowResult[];
}

interface ImportRowResult {
  line: number;
  status: "created" | "skipped" | "failed";
  reason?: string;
  fields?: string[];
}

const inputClass = cn(
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none",
  "placeholder:text-faint focus:border-accent",
);

export function LeadsWorkspace({ initialLeads }: { initialLeads: LeadRecord[] }) {
  const t = useTranslations("leads");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? initialLeads : initialLeads.filter((lead) => lead.status === statusFilter)),
    [initialLeads, statusFilter],
  );

  function refresh() {
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only">{t("filterLabel")}</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "ALL")}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          >
            <option value="ALL">{t("filters.all")}</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="press inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <FileArrowUp size={16} /> {t("import.action")}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="press inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={16} /> {t("create.action")}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-[0.08em] text-faint">
              <th className="px-4 py-3 font-medium">{t("table.company")}</th>
              <th className="px-4 py-3 font-medium">{t("table.contact")}</th>
              <th className="px-4 py-3 font-medium">{t("table.segment")}</th>
              <th className="px-4 py-3 font-medium">{t("table.source")}</th>
              <th className="px-4 py-3 font-medium">{t("table.owner")}</th>
              <th className="px-4 py-3 font-medium">{t("table.status")}</th>
              <th className="px-4 py-3 font-medium">{t("table.updated")}</th>
              <th className="px-4 py-3 font-medium">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  {t("table.empty")}
                </td>
              </tr>
            )}
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{lead.legalName}</p>
                  {lead.siren && <p className="text-xs text-faint">{lead.siren}</p>}
                </td>
                <td className="px-4 py-3">
                  {lead.contactName && <p className="text-ink">{lead.contactName}</p>}
                  {lead.contactEmail && <p className="text-xs text-muted">{lead.contactEmail}</p>}
                  {!lead.contactName && !lead.contactEmail && <span className="text-faint">—</span>}
                </td>
                <td className="px-4 py-3 text-muted">{lead.segment ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{lead.source ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{lead.ownerName}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={STATUS_TONES[lead.status]}>{t(`statuses.${lead.status}`)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(lead.updatedAt * 1000).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {(lead.status === "NEW" || lead.status === "QUALIFIED") && (
                    <ConvertButton leadId={lead.id} label={t("table.convert")} onDone={refresh} />
                  )}
                  {lead.convertedDossierId && (
                    <Link
                      href={`/dossiers/${lead.convertedDossierId}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {t("table.openDossier")}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateLeadDialog onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {showImport && <ImportLeadsDialog onClose={() => setShowImport(false)} onImported={refresh} />}
    </div>
  );
}

function ConvertButton({ leadId, label, onDone }: { leadId: string; label: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            const response = await fetch(`/api/crm/leads/${leadId}/convert`, { method: "POST" });
            if (!response.ok) throw new Error("convert failed");
            onDone();
          } catch {
            setError(true);
          } finally {
            setPending(false);
          }
        }}
        className="press text-sm font-medium text-accent hover:underline disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {error && <span className="text-xs text-danger">!</span>}
    </span>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-deep/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-diffuse">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="press rounded-lg p-2 text-muted hover:bg-surface-2" aria-label={title}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function CreateLeadDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const tc = useTranslations("leads.create");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      ["legalName", "siren", "contactName", "contactEmail", "contactPhone", "pdl", "segment", "source", "notes"]
        .map((key) => [key, String(form.get(key) ?? "").trim()])
        .filter(([, value]) => value !== ""),
    );
    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("create failed");
      onCreated();
    } catch {
      setError(tc("error"));
      setPending(false);
    }
  }

  return (
    <Dialog title={tc("title")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field name="legalName" label={tc("legalName")} required />
        <div className="grid grid-cols-2 gap-3">
          <Field name="siren" label={tc("siren")} />
          <Field name="segment" label={tc("segment")} placeholder="C2–C5" />
        </div>
        <Field name="contactName" label={tc("contactName")} />
        <div className="grid grid-cols-2 gap-3">
          <Field name="contactEmail" label={tc("contactEmail")} type="email" />
          <Field name="contactPhone" label={tc("contactPhone")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field name="pdl" label={tc("pdl")} />
          <Field name="source" label={tc("source")} />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">{tc("notes")}</span>
          <textarea name="notes" rows={3} className={cn(inputClass, "h-auto py-2")} />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="press h-10 rounded-lg border border-line px-4 text-sm text-muted">
            {tc("cancel")}
          </button>
          <button type="submit" disabled={pending} className="press h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "…" : tc("submit")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input name={name} type={type} required={required} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function ImportLeadsDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const ti = useTranslations("leads.import");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/crm/leads/import", {
        method: "POST",
        headers: { "x-idempotency-key": crypto.randomUUID() },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "import failed");
      setResult(body.import as ImportResult);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog title={ti("title")} onClose={onClose}>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>
          <a href="/templates/modele-import-prospects.xlsx" download className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
            <Download size={14} /> {ti("downloadTemplate")}
          </a>
        </li>
        <li>{ti("fillInstructions")}</li>
        <li>{ti("uploadInstructions")}</li>
      </ol>

      <div className="mt-4 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button onClick={() => fileRef.current?.click()} className="press h-10 rounded-lg border border-line px-4 text-sm text-ink hover:bg-surface-2">
          {ti("chooseFile")}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{file ? file.name : ti("noFile")}</span>
        <button
          onClick={submit}
          disabled={!file || pending}
          className="press h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "…" : ti("submit")}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-sm font-medium text-ink">
            {ti("summary", {
              total: result.totalRows,
              created: result.createdCount,
              skipped: result.skippedCount,
              failed: result.failedCount,
            })}
            {result.replayed && <span className="ml-2 text-xs text-faint">({ti("replayed")})</span>}
          </p>
          {result.rows.filter((row) => row.status !== "created").length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
              {result.rows
                .filter((row) => row.status !== "created")
                .map((row) => (
                  <li key={row.line}>
                    {ti(`row.${row.status}`, { line: row.line })}
                    {row.fields && row.fields.length > 0 && (
                      <span className="text-faint"> — {row.fields.map((field) => ti(`fields.${field}`)).join(", ")}</span>
                    )}
                  </li>
                ))}
            </ul>
          )}
          <div className="mt-3 flex justify-end">
            <button onClick={onImported} className="press h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-white">
              {ti("done")}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
