"use client";

import { useState } from "react";
import { Check, ShieldCheck, UserPlus, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AppRole } from "@/lib/access-control";
import type {
  OrganizationRecord,
  RegistrationRequestRecord,
  WhitelistRecord,
} from "@/lib/access-management/access-types";
import { StatusPill } from "@/components/workspace/status-pill";

const PARTNER_ROLES: AppRole[] = ["MASTER_ADMIN", "SUB_REGIE_ADMIN", "APPORTEUR"];

export function AdminAccessConsole({
  registrations,
  whitelist,
  organizations,
  preview,
}: {
  registrations: RegistrationRequestRecord[];
  whitelist: WhitelistRecord[];
  organizations: OrganizationRecord[];
  preview: boolean;
}) {
  const t = useTranslations("operator.access");
  const router = useRouter();
  const operatorOrganizations = organizations.filter((item) => item.kind === "OPERATOR");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "OPERATOR_FINANCE">("SUPER_ADMIN");
  const [organizationId, setOrganizationId] = useState(operatorOrganizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addWhitelist(event: React.FormEvent) {
    event.preventDefault();
    if (preview) return;
    setBusy(true);
    const response = await fetch("/api/admin/access/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, organizationId }),
    });
    setBusy(false);
    setMessage(response.ok ? t("whitelistCreated") : t("error"));
    if (response.ok) {
      setEmail("");
      router.refresh();
    }
  }

  async function revokeWhitelist(id: string) {
    setBusy(true);
    const response = await fetch(`/api/admin/access/whitelist/${id}`, { method: "DELETE" });
    setBusy(false);
    setMessage(response.ok ? t("whitelistRevoked") : t("error"));
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <UserPlus size={24} className="text-accent" />
          <div><h2 className="font-semibold text-ink">{t("registrationsTitle")}</h2><p className="mt-1 text-sm text-muted">{t("registrationsDescription")}</p></div>
        </div>
        <ul className="mt-5 divide-y divide-line">
          {registrations.filter((item) => item.status === "PENDING").map((registration) => (
            <RegistrationReview
              key={registration.clerkUserId}
              registration={registration}
              organizations={organizations}
              preview={preview}
              onComplete={() => router.refresh()}
            />
          ))}
          {registrations.every((item) => item.status !== "PENDING") && <li className="py-8 text-center text-sm text-muted">{t("noPendingRegistrations")}</li>}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line bg-surface-2 px-5 py-4"><h2 className="font-semibold text-ink">{t("whitelistTitle")}</h2><p className="mt-1 text-sm text-muted">{t("whitelistDescription")}</p></div>
          <ul className="divide-y divide-line">
            {whitelist.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-4 px-5 py-4 text-sm">
                <span className="min-w-0 flex-1"><strong className="block truncate text-ink">{entry.email}</strong><span className="text-xs text-muted">{t(`roles.${entry.role}`)} · {entry.organizationName}</span></span>
                <StatusPill tone={entry.status === "ACTIVE" ? "positive" : "warning"}>{t(entry.status === "ACTIVE" ? "active" : "revoked")}</StatusPill>
                {entry.status === "ACTIVE" && <button disabled={busy || preview} onClick={() => revokeWhitelist(entry.id)} className="press rounded-lg border border-line px-3 py-1.5 text-xs text-muted disabled:opacity-50">{t("revoke")}</button>}
              </li>
            ))}
          </ul>
        </section>

        <form onSubmit={addWhitelist} className="h-fit rounded-2xl border border-line bg-surface p-5">
          <ShieldCheck size={24} className="text-accent" />
          <h2 className="mt-4 font-semibold text-ink">{t("addInternalTitle")}</h2>
          <label className="mt-4 block text-xs font-medium text-muted">{t("email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink" /></label>
          <label className="mt-4 block text-xs font-medium text-muted">{t("role")}<select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"><option value="SUPER_ADMIN">{t("roles.SUPER_ADMIN")}</option></select></label>
          <label className="mt-4 block text-xs font-medium text-muted">{t("organization")}<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">{operatorOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || preview || !organizationId} className="press mt-5 h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? t("saving") : t("add")}</button>
          {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
        </form>
      </div>
    </div>
  );
}

function RegistrationReview({
  registration,
  organizations,
  preview,
  onComplete,
}: {
  registration: RegistrationRequestRecord;
  organizations: OrganizationRecord[];
  preview: boolean;
  onComplete: () => void;
}) {
  const t = useTranslations("operator.access");
  const [organizationId, setOrganizationId] = useState(organizations.find((item) => item.kind !== "OPERATOR")?.id ?? "");
  const [role, setRole] = useState<AppRole>("APPORTEUR");
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (preview) return;
    setBusy(true);
    setError(false);
    const response = await fetch(`/api/admin/access/registrations/${registration.clerkUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        version: registration.version,
        ...(registration.accountType === "CUSTOMER" ? { clientId } : { organizationId, role }),
      }),
    });
    setBusy(false);
    setError(!response.ok);
    if (response.ok) onComplete();
  }

  return (
    <li className="grid gap-4 py-5 lg:grid-cols-[1fr_1.15fr_auto] lg:items-end">
      <div><strong className="block text-sm text-ink">{registration.displayName}</strong><span className="text-xs text-muted">{registration.email}</span><span className="mt-2 block text-xs font-medium uppercase tracking-[0.08em] text-accent">{t(registration.accountType === "CUSTOMER" ? "customer" : "partner")}</span></div>
      {registration.accountType === "CUSTOMER" ? (
        <label className="text-xs font-medium text-muted">{t("clientId")}<input value={clientId} onChange={(event) => setClientId(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink" /></label>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted">{t("organization")}<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">{organizations.filter((item) => item.kind !== "OPERATOR" && item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted">{t("role")}<select value={role} onChange={(event) => setRole(event.target.value as AppRole)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">{PARTNER_ROLES.map((item) => <option key={item} value={item}>{t(`roles.${item}`)}</option>)}</select></label>
        </div>
      )}
      <div className="flex gap-2">
        <button disabled={busy || preview} onClick={() => decide("APPROVED")} aria-label={t("approve")} className="press flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-50"><Check size={17} /></button>
        <button disabled={busy || preview} onClick={() => decide("REJECTED")} aria-label={t("reject")} className="press flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-50"><X size={17} /></button>
      </div>
      {error && <p role="alert" className="text-sm text-danger lg:col-span-3">{t("error")}</p>}
    </li>
  );
}
