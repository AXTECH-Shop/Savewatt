import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";

export type IntegrationProvider = "DOCUSEAL" | "GIFTOGRAM";

export interface ProviderEventInput {
  provider: IntegrationProvider;
  providerEventKey: string;
  eventType: string;
  rawPayload: string;
}

export class ProviderEventRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async record(input: ProviderEventInput): Promise<boolean> {
    const payloadHash = createHash("sha256").update(input.rawPayload).digest("hex");
    const result = await this.database
      .prepare(
        `INSERT OR IGNORE INTO provider_webhook_events (
          id, provider, provider_event_key, event_type, payload_sha256, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        randomUUID(),
        input.provider,
        input.providerEventKey,
        input.eventType,
        payloadHash,
        input.rawPayload,
      )
      .run();

    return (result.meta.changes ?? 0) === 1;
  }

  async markProcessed(provider: IntegrationProvider, providerEventKey: string): Promise<void> {
    await this.database
      .prepare(
        `UPDATE provider_webhook_events
         SET status = 'PROCESSED', processed_at = unixepoch(), error_message = NULL
         WHERE provider = ? AND provider_event_key = ?`,
      )
      .bind(provider, providerEventKey)
      .run();
  }

  async markFailed(
    provider: IntegrationProvider,
    providerEventKey: string,
    message: string,
  ): Promise<void> {
    await this.database
      .prepare(
        `UPDATE provider_webhook_events
         SET status = 'FAILED', error_message = ?
         WHERE provider = ? AND provider_event_key = ?`,
      )
      .bind(message.slice(0, 500), provider, providerEventKey)
      .run();
  }
}
