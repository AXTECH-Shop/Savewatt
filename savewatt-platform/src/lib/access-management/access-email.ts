import { labelForRole, type AppRole } from "@/lib/access-control";
import { ADMIN_ORIGIN, APP_ORIGIN } from "@/lib/access/access-surface";
import { BRAND_COLORS as C } from "@/lib/brand";
import { renderBrandedEmail, renderBrandedEmailText } from "@/lib/email/email-layout";
import { sendEmail, type EmailBinding } from "@/lib/email/email-sender";

export const ACCESS_SIGN_UP_URL = `${APP_ORIGIN}/fr/sign-up?type=partner`;

export interface AccessEmailDetails {
  email: string;
  role: AppRole;
  organizationName: string;
  inviterName: string;
  /** Unix seconds; null for grants that do not expire (internal admins). */
  expiresAt: number | null;
}

/**
 * Emails an invitee their access link with step-by-step instructions.
 * Returns false when the message could not be sent.
 */
export async function sendAccessEmail(details: AccessEmailDetails, binding: EmailBinding | undefined): Promise<boolean> {
  const role = labelForRole(details.role, "fr");
  const internal = details.role === "SUPER_ADMIN" || details.role === "OPERATOR_FINANCE";
  const space = internal ? ADMIN_ORIGIN : APP_ORIGIN;
  const signIn = `${space}/fr/sign-in`;
  const expiry = details.expiresAt
    ? `Invitation valable jusqu'au ${new Date(details.expiresAt * 1000).toLocaleDateString("fr-FR")}.`
    : "";
  const steps = [
    `Cliquez sur « Créer mon accès » ci-dessous.`,
    `Inscrivez-vous avec l'adresse exacte <strong>${escapeHtml(details.email)}</strong> : email et mot de passe, ou « Continuer avec Google » si cette adresse est un compte Google.`,
    `Saisissez le code de vérification reçu par email.`,
    `Votre espace s'ouvre automatiquement avec votre rôle ${escapeHtml(role)} (${escapeHtml(space.replace("https://", ""))}).`,
  ];
  const outcome = await sendEmail(
    {
      to: [details.email],
      subject: `Zack AI — Votre accès ${role} · ${details.organizationName}`,
      html: renderBrandedEmail(`<p style="margin:0 0 12px;">Bonjour,</p>
        <p style="margin:0 0 16px;">${escapeHtml(details.inviterName)} vous donne accès à la plateforme Zack AI en tant que
        <strong>${escapeHtml(role)}</strong> pour <strong>${escapeHtml(details.organizationName)}</strong>.</p>
        <p style="margin:0 0 8px;font-weight:700;color:${C.navyDeep};">Pour activer votre accès :</p>
        <ol style="margin:0 0 16px;padding-left:20px;">${steps.map((step) => `<li style="margin:0 0 6px;">${step}</li>`).join("")}</ol>
        <p style="margin:0 0 16px;"><a href="${ACCESS_SIGN_UP_URL}" style="display:inline-block;background:${C.navy};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Créer mon accès</a></p>
        <p style="margin:0 0 12px;font-size:13px;color:${C.muted};">Vous avez déjà un compte avec cette adresse ?
        <a href="${signIn}" style="color:${C.navy};">Connectez-vous directement</a>.</p>
        <p style="margin:0;font-size:12px;color:${C.muted};">${expiry} Une autre adresse email ne sera pas reconnue.
        Lien direct : <a href="${ACCESS_SIGN_UP_URL}" style="color:${C.navy};">${ACCESS_SIGN_UP_URL}</a></p>`),
      text: renderBrandedEmailText([
        "Bonjour,",
        `${details.inviterName} vous donne accès à la plateforme Zack AI en tant que ${role} pour ${details.organizationName}.`,
        [
          "Pour activer votre accès :",
          `1. Ouvrez ${ACCESS_SIGN_UP_URL}`,
          `2. Inscrivez-vous avec l'adresse exacte ${details.email} (email et mot de passe, ou « Continuer avec Google »).`,
          "3. Saisissez le code de vérification reçu par email.",
          `4. Votre espace s'ouvre automatiquement (${space.replace("https://", "")}).`,
        ].join("\n"),
        `Déjà un compte avec cette adresse ? Connectez-vous : ${signIn}`,
        expiry,
      ].filter(Boolean)),
    },
    binding,
  );
  if (outcome.kind !== "sent") console.error("ACCESS_EMAIL_FAILED", details.email, outcome);
  return outcome.kind === "sent";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}
