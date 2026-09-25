import "server-only";

import { randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import {
  isTerminalDeliveryState,
  shouldApplyDeliveryUpdate,
  type OfferDeliveryState,
} from "./offer-delivery-state";

interface TrackedDeliveryRow {
  id: string;
  offer_version_id: string;
  organization_id: string;
  dossier_id: string;
  state: OfferDeliveryState;
}

export type DeliveryTrackingResult = "APPLIED" | "IGNORED_STALE" | "NOT_FOUND";

export class OfferDeliveryTracker {
  constructor(private readonly database: D1Database = DatabaseManager.getDatabase()) {}

  async applyProviderUpdate(
    providerMessageId: string,
    incoming: OfferDeliveryState,
    detail: string | null,
  ): Promise<DeliveryTrackingResult> {
    const row = await this.database
      .prepare(
        `SELECT delivery.id, delivery.offer_version_id, delivery.state,
                version.organization_id, version.dossier_id
         FROM offer_deliveries delivery
         JOIN offer_versions version ON version.id = delivery.offer_version_id
         WHERE delivery.provider_message_id = ?
         ORDER BY delivery.created_at DESC
         LIMIT 1`,
      )
      .bind(providerMessageId)
      .first<TrackedDeliveryRow>();
    if (!row) return "NOT_FOUND";
    if (!shouldApplyDeliveryUpdate(row.state, incoming)) return "IGNORED_STALE";

    const updated = await this.database
      .prepare(
        `UPDATE offer_deliveries
         SET state = ?, error = ?
         WHERE id = ? AND state = ?`,
      )
      .bind(incoming, detail, row.id, row.state)
      .run();
    if ((updated.meta.changes ?? 0) !== 1) return "IGNORED_STALE";

    if (isTerminalDeliveryState(incoming)) {
      await this.recordTimelineEvent(row, incoming, detail);
    }
    return "APPLIED";
  }

  private async recordTimelineEvent(
    row: TrackedDeliveryRow,
    state: OfferDeliveryState,
    detail: string | null,
  ): Promise<void> {
    const eventType =
      state === "DELIVERED"
        ? "OFFER_DELIVERED"
        : state === "BOUNCED"
          ? "OFFER_BOUNCED"
          : "OFFER_FAILED";
    const summary =
      state === "DELIVERED"
        ? "Offre distribuée au destinataire"
        : state === "BOUNCED"
          ? "Offre non distribuée (rebond)"
          : "Échec de distribution de l'offre";
    await this.database
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
          state,
          ...(detail ? { detail } : {}),
        }),
      )
      .run();
  }
}
