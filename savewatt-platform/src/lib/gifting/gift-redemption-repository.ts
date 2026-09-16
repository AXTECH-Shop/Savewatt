import "server-only";
import { randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";

export interface RedemptionReservation {
  externalId: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string;
  amountCents: number;
  organizationId: string;
  userId: string;
}

interface GiftRedemptionRow {
  id: string;
  external_id: string;
  status: string;
  provider_order_id: string | null;
  amount_cents: number;
  campaign_id: string;
}

export class GiftRedemptionRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async resolveOrganizationId(
    clerkOrganizationId: string,
    userId: string,
  ): Promise<string | null> {
    const row = await this.database
      .prepare(
        `SELECT organization.id
         FROM organizations organization
         JOIN memberships membership
           ON membership.organization_id = organization.id
          AND membership.user_id = ?
          AND membership.status = 'ACTIVE'
         WHERE (organization.clerk_org_id = ? OR organization.id = ?)
           AND membership.role IN (
             'MASTER_ADMIN', 'SUB_REGIE_ADMIN', 'TEAM_MANAGER', 'APPORTEUR'
           )
         LIMIT 1`,
      )
      .bind(userId, clerkOrganizationId, clerkOrganizationId)
      .first<{ id: string }>();
    return row?.id ?? null;
  }

  async reserve(input: RedemptionReservation): Promise<GiftRedemptionRow | null> {
    const wallet = await this.database
      .prepare(
        `SELECT id FROM wallet_accounts
         WHERE organization_id = ? AND user_id = ? AND currency = 'EUR' LIMIT 1`,
      )
      .bind(input.organizationId, input.userId)
      .first<{ id: string }>();
    if (!wallet) return null;

    const redemptionId = randomUUID();
    const ledgerId = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO gift_redemptions (
            id, organization_id, user_id, wallet_id, provider, external_id,
            campaign_id, recipient_email, recipient_name, amount_cents
          )
          SELECT ?, ?, ?, id, 'GIFTOGRAM', ?, ?, ?, ?, ?
          FROM wallet_accounts
          WHERE id = ? AND available_balance_cents >= ?`,
        )
        .bind(
          redemptionId,
          input.organizationId,
          input.userId,
          input.externalId,
          input.campaignId,
          input.recipientEmail,
          input.recipientName,
          input.amountCents,
          wallet.id,
          input.amountCents,
        ),
      this.database
        .prepare(
          `UPDATE wallet_accounts
           SET available_balance_cents = available_balance_cents - ?, updated_at = unixepoch()
           WHERE id = ?
             AND EXISTS (SELECT 1 FROM gift_redemptions WHERE external_id = ?)
             AND NOT EXISTS (
               SELECT 1 FROM wallet_transactions
               WHERE wallet_id = ? AND source_type = 'GIFTOGRAM_ORDER' AND source_id = ?
             )`,
        )
        .bind(input.amountCents, wallet.id, input.externalId, wallet.id, input.externalId),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO wallet_transactions (
            id, wallet_id, kind, amount_cents, source_type, source_id
          )
          SELECT ?, ?, 'GIFT_REDEMPTION', ?, 'GIFTOGRAM_ORDER', ?
          WHERE EXISTS (SELECT 1 FROM gift_redemptions WHERE external_id = ?)`,
        )
        .bind(ledgerId, wallet.id, -input.amountCents, input.externalId, input.externalId),
    ]);

    return this.findByExternalId(input.externalId);
  }

  async markIssued(
    externalId: string,
    providerOrderId: string,
    providerPayload: Record<string, unknown>,
  ): Promise<void> {
    await this.database
      .prepare(
        `UPDATE gift_redemptions
         SET provider_order_id = ?, provider_payload_json = ?, status = 'ISSUED',
             updated_at = unixepoch()
         WHERE external_id = ?`,
      )
      .bind(providerOrderId, JSON.stringify(providerPayload), externalId)
      .run();
  }

  async markFailedAndRelease(externalId: string): Promise<void> {
    const row = await this.database
      .prepare(
        `SELECT wallet_id, amount_cents FROM gift_redemptions
         WHERE external_id = ? LIMIT 1`,
      )
      .bind(externalId)
      .first<{ wallet_id: string; amount_cents: number }>();
    if (!row) return;

    await this.database.batch([
      this.database
        .prepare(
          `UPDATE wallet_accounts
           SET available_balance_cents = available_balance_cents + ?, updated_at = unixepoch()
           WHERE id = ? AND NOT EXISTS (
             SELECT 1 FROM wallet_transactions
             WHERE wallet_id = ? AND source_type = 'GIFTOGRAM_RELEASE' AND source_id = ?
           )`,
        )
        .bind(row.amount_cents, row.wallet_id, row.wallet_id, externalId),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO wallet_transactions (
            id, wallet_id, kind, amount_cents, source_type, source_id
          ) VALUES (?, ?, 'REVERSAL', ?, 'GIFTOGRAM_RELEASE', ?)`,
        )
        .bind(randomUUID(), row.wallet_id, row.amount_cents, externalId),
      this.database
        .prepare(
          `UPDATE gift_redemptions
           SET status = 'FAILED', updated_at = unixepoch()
           WHERE external_id = ? AND status = 'PENDING'`,
        )
        .bind(externalId),
    ]);
  }

  async findByExternalId(externalId: string): Promise<GiftRedemptionRow | null> {
    return this.database
      .prepare(
        `SELECT id, external_id, status, provider_order_id, amount_cents, campaign_id
         FROM gift_redemptions WHERE external_id = ? LIMIT 1`,
      )
      .bind(externalId)
      .first<GiftRedemptionRow>();
  }
}
