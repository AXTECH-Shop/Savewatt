"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FilePdf, UploadSimple, CheckCircle, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export function UploadDropzone({
  label,
  file,
  onChange,
}: {
  label: string;
  file?: File;
  onChange: (file?: File) => void;
}) {
  const t = useTranslations("newDossier");
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function take(files: FileList | null) {
    const selected = files?.[0];
    if (selected) onChange(selected);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {file ? (
        <div className="flex items-center gap-3 rounded-[0.7rem] border border-accent/30 bg-accent-soft px-3 py-3">
          <FilePdf size={22} weight="fill" className="text-accent-ink" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{file.name}</p>
            <p className="nums text-[12px] text-muted">
              {(file.size / 1024).toFixed(0)} KB · {t("fileReady")}
            </p>
          </div>
          <CheckCircle size={18} weight="fill" className="text-accent" />
          <button
            onClick={() => onChange(undefined)}
            className="press rounded-md p-1 text-muted hover:text-danger"
            aria-label={t("removeFile")}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            take(e.dataTransfer.files);
          }}
          className={cn(
            "press flex flex-col items-center gap-2 rounded-[0.7rem] border border-dashed px-4 py-7 text-center",
            drag ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2 hover:border-accent/50",
          )}
        >
          <UploadSimple size={22} className="text-faint" />
          <span className="text-[13px] text-muted">{t("dropHint")}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}
