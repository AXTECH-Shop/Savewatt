import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { labelForRole } from "@/lib/access-control";
import { APP_ORIGIN } from "@/lib/access/access-surface";
import { BRAND_COLORS as C } from "@/lib/brand";
import { renderBrandedEmail, renderBrandedEmailText } from "@/lib/email/email-layout";
import { sendEmail, type EmailBinding } from "@/lib/email/email-sender";
import type { InvitationRecord } from "./access-types";

export const INVITATION_SIGN_UP_URL = `${APP_ORIGIN}/fr/sign-up?type=partner`;
export const INVITATION_SIGN_IN_URL = `${APP_ORIGIN}/fr/sign-in`;

/** Emails the invitee their access link. Returns false when the message could not be sent. */
export async function sendInvitationEmail(invitation: InvitationRecord, inviterName: string): Promise<boolean> {
  const role = labelForRole(invitation.role, "fr");
  const expires = new Date(invitation.expiresAt * 1000).toLocaleDateString("fr-FR");
  const outcome = await sendEmail(
    {
      to: [invitation.email],
      subject: `Zack AI — Votre accès ${role} · ${invitation.organizationName}`,
      html: renderBrandedEmail(`<p style="margin:0 0 12px;">Bonjour,</p>
        <p style="margin:0 0 12px;">${escapeHtml(inviterName)} vous invite sur la plateforme Zack AI en tant que
        <strong>${escapeHtml(role)}</strong> pour <strong>${escapeHtml(invitation.organizationName)}</strong>.</p>
        <p style="margin:0 0 16px;">Créez votre accès avec cette adresse email
        (<strong>${escapeHtml(invitation.email)}</strong>) : votre espace est activé automatiquement.</p>
        <p style="margin:0 0 16px;"><a href="${INVITATION_SIGN_UP_URL}" style="display:inline-block;background:${C.navy};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Créer mon accès</a></p>
        <p style="margin:0 0 12px;font-size:13px;color:${C.muted};">Vous avez déjà un compte, ou un compte Google avec cette adresse ?
        <a href="${INVITATION_SIGN_IN_URL}" style="color:${C.navy};">Connectez-vous directement</a>.</p>
        <p style="margin:0;font-size:12px;color:${C.muted};">Invitation valable jusqu'au ${expires}. Utilisez exactement l'adresse
        ${escapeHtml(invitation.email)} : une autre adresse ne sera pas reconnue.</p>`),
      text: renderBrandedEmailText([
        "Bonjour,",
        `${inviterName} vous invite sur la plateforme Zack AI en tant que ${role} pour ${invitation.organizationName}.`,
        `Créez votre accès avec l'adresse ${invitation.email} : ${INVITATION_SIGN_UP_URL}`,
        `Déjà un compte (ou un compte Google avec cette adresse) ? Connectez-vous : ${INVITATION_SIGN_IN_URL}`,
        `Invitation valable jusqu'au ${expires}.`,
      ]),
    },
    (getCloudflareContext().env as { EMAIL?: EmailBinding }).EMAIL,
  );
  if (outcome.kind !== "sent") console.error("INVITATION_EMAIL_FAILED", invitation.id, outcome);
  return outcome.kind === "sent";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}
