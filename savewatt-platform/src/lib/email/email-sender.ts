/** Transactional email through the Cloudflare Email Service `send_email` binding (EMAIL). */
export const DEFAULT_FROM = { email: "offres@savewatt.fr", name: "SaveWatt" };

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
  type: string;
}

export interface EmailInput {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: { email: string; name?: string };
  attachments?: EmailAttachment[];
}

/** Structural subset of the Workers `SendEmail` binding used here. */
export interface EmailBinding {
  send(message: {
    to: string[];
    from: { email: string; name?: string };
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
