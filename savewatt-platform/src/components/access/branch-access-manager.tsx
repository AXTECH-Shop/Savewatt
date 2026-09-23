"use client";

import { useState } from "react";
import { EnvelopeSimple, Plus, ShieldCheck } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AppRole } from "@/lib/access-control";
import type {
  InvitationRecord,
  MembershipRecord,
  OrganizationKind,
  OrganizationRecord,
} from "@/lib/access-management/access-types";
import { StatusPill } from "@/components/workspace/status-pill";

const ROLES: Record<OrganizationKind, AppRole[]> = {
  OPERATOR: [],
  MASTER: ["MASTER_ADMIN", "MASTER_BACKOFFICE", "READ_ONLY"],
  SUB_REGIE: ["SUB_REGIE_ADMIN", "MASTER_BACKOFFICE", "READ_ONLY"],
  TEAM: ["TEAM_MANAGER", "APPORTEUR", "READ_ONLY"],
};

export function BranchAccessManager({
  organizations,
  members,
  invitations,
  preview,
}: {
  organizations: OrganizationRecord[];
  members: MembershipRecord[];
  invitations: InvitationRecord[];
  preview: boolean;
}) {
  const t = useTranslations("organization.users");
  const router = useRouter();
  const availableOrganizations = organizations.filter((item) => ROLES[item.kind].length > 0);
  const [organizationId, setOrganizationId] = useState(availableOrganizations[0]?.id ?? "");
  const organization = availableOrganizations.find((item) => item.id === organizationId);
  const roles = organization ? ROLES[organization.kind] : [];
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>(roles[0] ?? "APPORTEUR");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function chooseOrganization(value: string) {
    setOrganizationId(value);
    const selected = availableOrganizations.find((item) => item.id === value);
    if (selected) setRole(ROLES[selected.kind][0]);
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!organization || preview) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/organizations/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: organization.id, email, role }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage(t("error"));
      return;
    }
    setEmail("");
    setMessage(t("created"));
    router.refresh();
  }

  async function updateMember(member: MembershipRecord) {
    setBusy(true);
    const response = await fetch(`/api/organizations/memberships/${member.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: member.organizationId,
        status: member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
        version: member.version,
      }),
    });
    setBusy(false);
    setMessage(response.ok ? t("updated") : t("error"));
    if (response.ok) router.refresh();
  }

  async function revoke(invitation: InvitationRecord) {
    setBusy(true);
    const response = await fetch(`/api/organizations/invitations/${invitation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: invitation.version }),
    });
    setBusy(false);
    setMessage(response.ok ? t("revoked") : t("error"));
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_auto] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint">
            <span>{t("user")}</span><span>{t("role")}</span><span>{t("scope")}</span><span>{t("status")}</span>
          </div>
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={`${member.organizationId}:${member.userId}`} className="grid grid-cols-[1.3fr_0.8fr_0.8fr_auto] items-center gap-4 px-5 py-4 text-sm">
                <span><strong className="block text-ink">{member.displayName}</strong><span className="text-xs text-muted">{member.email}</span></span>
                <span className="text-muted">{t(`roles.${member.role}`)}</span>
                <span className="text-muted">{member.organizationName}</span>
                <button disabled={busy || preview} onClick={() => updateMember(member)} className="press disabled:opacity-50">
                  <StatusPill tone={member.status === "ACTIVE" ? "positive" : "warning"}>{t(member.status === "ACTIVE" ? "active" : "suspended")}</StatusPill>
                </button>
              </li>
            ))}
            {members.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">{t("emptyMembers")}</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">{t("pendingTitle")}</h2>
          <ul className="mt-4 divide-y divide-line">
            {invitations.filter((item) => item.status === "PENDING").map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1"><strong className="block truncate text-ink">{invitation.email}</strong><span className="text-xs text-muted">{invitation.organizationName} · {t(`roles.${invitation.role}`)}</span></span>
                <button disabled={busy || preview} onClick={() => revoke(invitation)} className="press rounded-lg border border-line px-3 py-1.5 text-xs text-muted disabled:opacity-50">{t("revoke")}</button>
              </li>
            ))}
            {invitations.every((item) => item.status !== "PENDING") && <li className="py-5 text-sm text-muted">{t("emptyInvitations")}</li>}
          </ul>
        </section>
      </div>

      <aside className="space-y-5">
        <form onSubmit={invite} className="rounded-2xl border border-line bg-surface p-5">
          <EnvelopeSimple size={24} className="text-accent" />
          <h2 className="mt-4 font-semibold text-ink">{t("invite")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t("secureInvitationDescription")}</p>
          <label className="mt-4 block text-xs font-medium text-muted">{t("email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink" /></label>
          <label className="mt-4 block text-xs font-medium text-muted">{t("scope")}<select value={organizationId} onChange={(event) => chooseOrganization(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">{availableOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="mt-4 block text-xs font-medium text-muted">{t("role")}<select value={role} onChange={(event) => setRole(event.target.value as AppRole)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink">{roles.map((item) => <option key={item} value={item}>{t(`roles.${item}`)}</option>)}</select></label>
          <button disabled={busy || preview || !organization} className="press mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"><Plus size={16} />{busy ? t("saving") : t("invite")}</button>
          {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
        </form>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <ShieldCheck size={24} className="text-accent" />
          <h2 className="mt-4 font-semibold text-ink">{t("permissionsTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t("permissionsDescription")}</p>
        </section>
      </aside>
    </div>
  );
}
