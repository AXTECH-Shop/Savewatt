"use client";

import { useState } from "react";
import { Plus, TreeStructure } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { OrganizationKind, OrganizationRecord } from "@/lib/access-management/access-types";
import { StatusPill } from "@/components/workspace/status-pill";

const CHILD_OPTIONS: Record<OrganizationKind, OrganizationKind[]> = {
  OPERATOR: ["MASTER"],
  MASTER: ["SUB_REGIE"],
  SUB_REGIE: [],
  TEAM: [],
};

export function OrganizationTreeManager({
  organizations,
  preview,
}: {
  organizations: OrganizationRecord[];
  preview: boolean;
}) {
  const t = useTranslations("organization.management");
  const router = useRouter();
  const parents = organizations.filter((organization) => CHILD_OPTIONS[organization.kind].length > 0);
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const parent = parents.find((organization) => organization.id === parentId) ?? parents[0];
  const [kind, setKind] = useState<OrganizationKind>(parent ? CHILD_OPTIONS[parent.kind][0] : "TEAM");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    if (!parent || !name.trim() || preview) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: parent.id, kind, name }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage(t("error"));
      return;
    }
    setName("");
    setMessage(t("created"));
    router.refresh();
  }

  async function toggleStatus(organization: OrganizationRecord) {
    if (preview) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/organizations/${organization.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: organization.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
        version: organization.version,
      }),
    });
    setBusy(false);
    setMessage(response.ok ? t("updated") : t("error"));
    if (response.ok) router.refresh();
  }

  function selectParent(value: string) {
    setParentId(value);
    const selected = parents.find((organization) => organization.id === value);
    if (selected) setKind(CHILD_OPTIONS[selected.kind][0]);
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <ul className="space-y-3">
          {organizations.map((organization) => (
            <li key={organization.id} style={{ marginLeft: `${Math.min(organization.depth, 3) * 18}px` }}>
              <div className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <TreeStructure size={18} />
                  </span>
                  <span>
                    <strong className="block text-sm text-ink">{organization.name}</strong>
                    <span className="font-mono text-[11px] text-faint">{organization.path}</span>
                  </span>
                </span>
                <span className="text-sm text-muted"><strong className="nums text-ink">{organization.activeMembers}</strong> {t("members")}</span>
                <span className="text-sm text-muted"><strong className="nums text-ink">{organization.openDossiers}</strong> {t("files")}</span>
                <button
                  type="button"
                  disabled={busy || preview || organization.kind === "OPERATOR"}
                  onClick={() => toggleStatus(organization)}
                  className="press disabled:opacity-50"
                >
                  <StatusPill tone={organization.status === "ACTIVE" ? "positive" : "warning"}>
                    {t(organization.status === "ACTIVE" ? "active" : "suspended")}
                  </StatusPill>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={createOrganization} className="h-fit rounded-2xl border border-line bg-surface p-5">
        <Plus size={22} className="text-accent" />
        <h2 className="mt-3 font-semibold text-ink">{t("createTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{t("createDescription")}</p>
        <label className="mt-5 block text-xs font-medium text-muted">
          {t("parent")}
          <select value={parent?.id ?? ""} onChange={(event) => selectParent(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">
            {parents.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-xs font-medium text-muted">
          {t("type")}
          <select value={kind} onChange={(event) => setKind(event.target.value as OrganizationKind)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">
            {(parent ? CHILD_OPTIONS[parent.kind] : []).map((option) => <option key={option} value={option}>{t(`kinds.${option}`)}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-xs font-medium text-muted">
          {t("name")}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink" />
        </label>
        <button disabled={busy || preview || !parent} className="press mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50">
          <Plus size={16} /> {busy ? t("saving") : t("create")}
        </button>
        {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
        {preview && <p className="mt-3 text-xs text-muted">{t("previewDisabled")}</p>}
      </form>
    </div>
  );
}
