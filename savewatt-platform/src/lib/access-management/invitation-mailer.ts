import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { EmailBinding } from "@/lib/email/email-sender";
import { sendAccessEmail } from "./access-email";
import type { InvitationRecord, WhitelistRecord } from "./access-types";

function emailBinding(): EmailBinding | undefined {
  return (getCloudflareContext().env as { EMAIL?: EmailBinding }).EMAIL;
}

export function sendInvitationEmail(invitation: InvitationRecord, inviterName: string): Promise<boolean> {
  return sendAccessEmail(
    {
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organizationName,
      inviterName,
      expiresAt: invitation.expiresAt,
    },
    emailBinding(),
  );
}

export function sendWhitelistEmail(entry: WhitelistRecord, inviterName: string): Promise<boolean> {
  return sendAccessEmail(
    {
      email: entry.email,
      role: entry.role,
      organizationName: entry.organizationName,
      inviterName,
      expiresAt: null,
    },
    emailBinding(),
  );
}
