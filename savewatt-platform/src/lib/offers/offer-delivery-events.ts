import { randomUUID } from "node:crypto";
import {
  isTerminalDeliveryState,
  shouldApplyDeliveryUpdate,
  type OfferDeliveryState,
} from "./offer-delivery-state.ts";

/**
 * Cloudflare Email Service lifecycle events (Queues event subscription on
 * savewatt.fr). Runs in the Worker `queue` handler, so it must stay free of
 * `server-only`, path aliases and the OpenNext request context.
 */
export interface EmailSendingEvent {
  type?: string;
  payload?: {
    messageId?: string;
    delivery?: { status?: string; smtpResponse?: string };
    bounce?: { reason?: string };
    failure?: { reason?: string };
    rejection?: { reason?: string; detail?: string };
  };
}

export interface DeliveryUpdate {
  messageId: string;
  state: OfferDeliveryState;
  detail: string | null;
}

const EVENT_STATES: Record<string, OfferDeliveryState> = {
  "cf.email.sending.message.delivered": "DELIVERED",
  "cf.email.sending.message.bounced": "BOUNCED",
  "cf.email.sending.message.complained": "BOUNCED",
  "cf.email.sending.message.failed": "FAILED",
  "cf.email.sending.message.rejected": "FAILED",
};

/** Map an event to a delivery update; `null` for deferred/unknown events. */
export function deliveryUpdateFromEmailEvent(event: EmailSendingEvent): DeliveryUpdate | null {
  const state = event.type ? EVENT_STATES[event.type] : undefined;
  const messageId = event.payload?.messageId;
  if (!state || !messageId) return null;
  const payload = event.payload ?? {};
  const detail =
    payload.bounce?.reason ??
    payload.rejection?.detail ??
    payload.rejection?.reason ??
    payload.failure?.reason ??
    (state === "DELIVERED" ? null : payload.delivery?.smtpResponse ?? null);
  return { messageId, state, detail };
}

interface TrackedDeliveryRow {
  id: string;
  offer_version_id: string;
  organization_id: string;
  dossier_id: string;
  state: OfferDeliveryState;
  recipient_email: string;
}

export type DeliveryTrackingResult = "APPLIED" | "IGNORED_STALE" | "NOT_FOUND";

/**
 * Apply a provider callback. The offer version only becomes SENT (and the
 * dossier `sent`) once the recipient's server has accepted the message.
 */
export async function applyDeliveryUpdate(
  database: D1Database,
  update: DeliveryUpdate,
): Promise<DeliveryTrackingResult> {
  const row = await database
    .prepare(
      `SELECT delivery.id, delivery.offer_version_id, delivery.state, delivery.recipient_email,
              version.organization_id, version.dossier_id
       FROM offer_deliveries delivery
       JOIN offer_versions version ON version.id = delivery.offer_version_id
       WHERE delivery.provider_message_id = ?
       ORDER BY delivery.created_at DESC
       LIMIT 1`,
    )
    .bind(update.messageId)
    .first<TrackedDeliveryRow>();
  if (!row) return "NOT_FOUND";
  if (!shouldApplyDeliveryUpdate(row.state, update.state)) return "IGNORED_STALE";

  const updated = await database
    .prepare(`UPDATE offer_deliveries SET state = ?, error = ? WHERE id = ? AND state = ?`)
    .bind(update.state, update.detail, row.id, row.state)
    .run();
  if ((updated.meta.changes ?? 0) !== 1) return "IGNORED_STALE";

  const statements: D1PreparedStatement[] = [];
  if (update.state === "DELIVERED") {
    statements.push(
      database
        .prepare(`UPDATE offer_versions SET status = 'SENT' WHERE id = ? AND status IN ('DRAFT', 'APPROVED')`)
        .bind(row.offer_version_id),
      database
        .prepare(
          `UPDATE dossiers SET status = 'sent', version = version + 1, updated_at = unixepoch()
           WHERE id = ? AND status = 'proposalReady'`,
        )
        .bind(row.dossier_id),
    );
  }
  if (isTerminalDeliveryState(update.state)) {
    statements.push(timelineEvent(database, row, update));
  }
  if (statements.length) await database.batch(statements);
  return "APPLIED";
}

function timelineEvent(
  database: D1Database,
  row: TrackedDeliveryRow,
  update: DeliveryUpdate,
): D1PreparedStatement {
  const [eventType, summary] =
    update.state === "DELIVERED"
      ? ["OFFER_SENT", "Offre reçue par le serveur du destinataire"]
      : update.state === "BOUNCED"
        ? ["OFFER_BOUNCED", "Offre non distribuée (rebond)"]
        : ["OFFER_FAILED", "Échec de distribution de l'offre"];
  return database
    .prepare(
      `INSERT INTO dossier_events (
         id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
       ) VALUES (?, ?, ?, NULL, ?, ?, ?)`,
    )
    .bind(
      randomUUID(),
      row.organization_id,
      row.dossier_id,
      eventType,
      summary,
      JSON.stringify({
        deliveryId: row.id,
        offerVersionId: row.offer_version_id,
        recipient: row.recipient_email,
        state: update.state,
        ...(update.detail ? { detail: update.detail } : {}),
      }),
    );
}

/** Worker `queue` handler body for the Email Sending event subscription. */
export async function handleEmailEventBatch(
  batch: MessageBatch<EmailSendingEvent>,
  database: D1Database,
): Promise<void> {
  for (const message of batch.messages) {
    const update = deliveryUpdateFromEmailEvent(message.body);
    if (!update) {
      message.ack();
      continue;
    }
    try {
      await applyDeliveryUpdate(database, update);
      message.ack();
    } catch (error) {
      console.error("email event processing failed", {
        messageId: update.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
}
