import { BRAND } from "../brand.ts";

/**
 * Transactional email through the Cloudflare Email Service `send_email` binding (EMAIL).
 * The sender address stays on savewatt.fr: it is the domain onboarded to
 * Cloudflare Email Service (heyzack.ai DNS is not on Cloudflare). Customers
 * see the Zack AI name and their replies reach the Zack AI inbox.
 */
export const DEFAULT_FROM = { email: "offres@savewatt.fr", name: BRAND.name };
export const DEFAULT_REPLY_TO = BRAND.contactEmail;

export interface EmailAttachment {
  filename: string;
  /** Binary files must be passed as bytes: base64 strings arrived corrupted in production. */
  content: string | ArrayBuffer | Uint8Array;
  type: string;
}

export interface EmailInput {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: { email: string; name?: string };
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/** Structural subset of the Workers `SendEmail` binding used here. */
export interface EmailBinding {
  send(message: {
    to: string[];
    from: { email: string; name?: string };
    replyTo?: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: (EmailAttachment & { disposition: "attachment" })[];
  }): Promise<{ messageId: string }>;
}

export type EmailSendOutcome =
  | { kind: "sent"; providerMessageId: string | null }
  | { kind: "skipped"; reason: "EMAIL_BINDING_MISSING" }
  | { kind: "failed"; error: string };

export async function sendEmail(
  input: EmailInput,
  binding: EmailBinding | undefined | null,
): Promise<EmailSendOutcome> {
  if (!binding) {
    console.warn("EMAIL binding missing — transactional email skipped", {
      to: input.to,
      subject: input.subject,
    });
    return { kind: "skipped", reason: "EMAIL_BINDING_MISSING" };
  }
  try {
    const result = await binding.send({
      to: input.to,
      from: input.from ?? DEFAULT_FROM,
      replyTo: input.replyTo ?? DEFAULT_REPLY_TO,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.attachments?.length
        ? { attachments: input.attachments.map((file) => ({ ...file, disposition: "attachment" as const })) }
        : {}),
    });
    return { kind: "sent", providerMessageId: result.messageId ?? null };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "failed", error: code ? `${code}: ${message}` : message };
  }
}
