import "server-only";

import { randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import type { RewardReason } from "@/lib/gifting/reward-policy";

export interface RewardRecipient {
  userId: string;
  organizationId: string;
  organizationName: string;
  displayName: string;
  email: string;
  role: string;
  recipientKind: "PARTNER" | "CUSTOMER";
  benefitSelectionId: string | null;
}

export interface AdminRewardIssuance {
  externalId: string;
  campaignId: string;
  issuedByUserId: string;
  recipient: RewardRecipient;
  amountCents: number;
  reason: RewardReason;
}

export interface GiftRewardRow {
  id: string;
  external_id: string;
  status: string;
  provider_order_id: string | null;
  amount_cents: number;
  campaign_id: string;
  recipient_name: string;
  recipient_email: string;
  reward_reason: RewardReason | null;
  created_at: number;
}

export interface PartnerWalletSummary {
  availableBalanceCents: number;
  issuedRewardCents: number;
  rewardCount: number;
}

const ELIGIBLE_PARTNER_ROLES = [
  "MASTER_ADMIN",
  "MASTER_BACKOFFICE",
  "SUB_REGIE_ADMIN",
  "TEAM_MANAGER",
  "APPORTEUR",
] as const;

export class GiftRedemptionRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async listEligiblePartners(): Promise<RewardRecipient[]> {
    const rows = await this.database
      .prepare(
        `SELECT
           user.id AS user_id,
           organization.id AS organization_id,
           organization.name AS organization_name,
           user.display_name,
           user.email,
           membership.role
         FROM memberships membership
         JOIN users user ON user.id = membership.user_id
         JOIN organizations organization ON organization.id = membership.organization_id
         WHERE membership.status = 'ACTIVE'
           AND membership.role IN (${ELIGIBLE_PARTNER_ROLES.map(() => "?").join(", ")})
         ORDER BY user.display_name COLLATE NOCASE, organization.name COLLATE NOCASE`,
      )
      .bind(...ELIGIBLE_PARTNER_ROLES)
      .all<{
        user_id: string;
        organization_id: string;
        organization_name: string;
        display_name: string;
        email: string;
        role: string;
      }>();

    return rows.results.map((row) => ({
      userId: row.user_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      displayName: row.display_name,
      email: row.email,
      role: row.role,
      recipientKind: "PARTNER",
      benefitSelectionId: null,
    }));
  }

  async listPendingCustomerRewards(): Promise<RewardRecipient[]> {
    const rows = await this.database
      .prepare(
        `SELECT DISTINCT
           selection.id AS selection_id,
           user.id AS user_id,
           selection.organization_id,
           client.legal_name AS organization_name,
           user.display_name,
           user.email
         FROM customer_benefit_selections selection
         JOIN users user ON user.id = selection.customer_user_id
         JOIN dossiers dossier ON dossier.id = selection.dossier_id
         JOIN clients client ON client.id = dossier.client_id
         WHERE selection.benefit_type = 'GIFT_CARD'
           AND selection.status = 'SELECTED'
         ORDER BY user.display_name COLLATE NOCASE`,
      )
      .all<{
        selection_id: string;
        user_id: string;
        organization_id: string;
        organization_name: string;
        display_name: string;
        email: string;
      }>();

    return rows.results.map((row) => ({
      userId: row.user_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      displayName: row.display_name,
      email: row.email,
      role: "CLIENT",
      recipientKind: "CUSTOMER",
      benefitSelectionId: row.selection_id,
    }));
  }

  async findEligibleRecipient(
    userId: string,
    recipientKind: "PARTNER" | "CUSTOMER",
    benefitSelectionId?: string,
  ): Promise<RewardRecipient | null> {
    if (recipientKind === "CUSTOMER") {
      if (!benefitSelectionId) return null;
      const row = await this.database
        .prepare(
          `SELECT
             selection.id AS selection_id,
             user.id AS user_id,
             selection.organization_id,
             client.legal_name AS organization_name,
             user.display_name,
             user.email
           FROM customer_benefit_selections selection
           JOIN users user ON user.id = selection.customer_user_id
           JOIN dossiers dossier ON dossier.id = selection.dossier_id
           JOIN clients client ON client.id = dossier.client_id
           WHERE user.id = ?
             AND selection.id = ?
             AND selection.benefit_type = 'GIFT_CARD'
             AND selection.status = 'SELECTED'
           ORDER BY selection.updated_at DESC
           LIMIT 1`,
        )
        .bind(userId, benefitSelectionId)
        .first<{
          selection_id: string;
          user_id: string;
          organization_id: string;
          organization_name: string;
          display_name: string;
          email: string;
        }>();

      if (!row) return null;
      return {
        userId: row.user_id,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        displayName: row.display_name,
        email: row.email,
        role: "CLIENT",
        recipientKind: "CUSTOMER",
        benefitSelectionId: row.selection_id,
      };
    }

    const row = await this.database
      .prepare(
        `SELECT
           user.id AS user_id,
           organization.id AS organization_id,
           organization.name AS organization_name,
           user.display_name,
           user.email,
           membership.role
         FROM memberships membership
         JOIN users user ON user.id = membership.user_id
         JOIN organizations organization ON organization.id = membership.organization_id
         WHERE user.id = ?
           AND membership.status = 'ACTIVE'
           AND membership.role IN (${ELIGIBLE_PARTNER_ROLES.map(() => "?").join(", ")})
         LIMIT 1`,
      )
      .bind(userId, ...ELIGIBLE_PARTNER_ROLES)
      .first<{
        user_id: string;
        organization_id: string;
        organization_name: string;
        display_name: string;
        email: string;
        role: string;
      }>();

    if (!row) return null;
    return {
      userId: row.user_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      displayName: row.display_name,
      email: row.email,
      role: row.role,
      recipientKind: "PARTNER",
      benefitSelectionId: null,
    };
  }

  async createAdminIssuance(input: AdminRewardIssuance): Promise<GiftRewardRow | null> {
    const walletId = randomUUID();
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO wallet_accounts (
           id, organization_id, user_id, currency
         ) VALUES (?, ?, ?, 'EUR')`,
      )
      .bind(walletId, input.recipient.organizationId, input.recipient.userId)
      .run();

    const wallet = await this.database
      .prepare(
        `SELECT id FROM wallet_accounts
         WHERE organization_id = ? AND user_id = ? AND currency = 'EUR'
         LIMIT 1`,
      )
      .bind(input.recipient.organizationId, input.recipient.userId)
      .first<{ id: string }>();
    if (!wallet) return null;

    const rewardId = randomUUID();
    const auditId = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO gift_redemptions (
             id, organization_id, user_id, wallet_id, provider, external_id,
             campaign_id, recipient_email, recipient_name, amount_cents,
             issued_by_user_id, recipient_kind, reward_reason
           ) VALUES (?, ?, ?, ?, 'TREMENDOUS', ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          rewardId,
          input.recipient.organizationId,
          input.recipient.userId,
          wallet.id,
          input.externalId,
          input.campaignId,
          input.recipient.email,
          input.recipient.displayName,
          input.amountCents,
          input.issuedByUserId,
          input.recipient.recipientKind,
          input.reason,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type,
             resource_id, metadata_json
           )
           SELECT ?, ?, ?, 'REWARD_ISSUED', 'GIFT_REWARD', id, ?
           FROM gift_redemptions
           WHERE id = ?`,
        )
        .bind(
          auditId,
          input.recipient.organizationId,
          input.issuedByUserId,
          JSON.stringify({
            recipientUserId: input.recipient.userId,
            amountCents: input.amountCents,
            reason: input.reason,
          }),
          rewardId,
        ),
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

  async markCustomerSelectionIssued(selectionId: string, rewardId: string): Promise<void> {
    await this.database
      .prepare(
        `UPDATE customer_benefit_selections
         SET status = 'REWARD_ISSUED', reward_redemption_id = ?, updated_at = unixepoch()
        WHERE id = ?
           AND benefit_type = 'GIFT_CARD'
           AND status = 'SELECTED'`,
      )
      .bind(rewardId, selectionId)
      .run();
  }

  async markFailed(externalId: string): Promise<void> {
    await this.database
      .prepare(
        `UPDATE gift_redemptions
         SET status = 'FAILED', updated_at = unixepoch()
         WHERE external_id = ? AND status = 'PENDING'`,
      )
      .bind(externalId)
      .run();
  }

  async listForRecipient(userId: string): Promise<GiftRewardRow[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, external_id, status, provider_order_id, amount_cents,
                campaign_id, recipient_name, recipient_email, reward_reason, created_at
         FROM gift_redemptions
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .bind(userId)
      .all<GiftRewardRow>();
    return rows.results;
  }

  async getPartnerWalletSummary(userId: string): Promise<PartnerWalletSummary> {
    const row = await this.database
      .prepare(
        `SELECT
           COALESCE(wallet.available_balance_cents, 0) AS available_balance_cents,
           COALESCE(SUM(CASE WHEN reward.status IN ('ISSUED', 'DELIVERED') THEN reward.amount_cents ELSE 0 END), 0) AS issued_reward_cents,
           COUNT(reward.id) AS reward_count
         FROM users user
         LEFT JOIN wallet_accounts wallet
           ON wallet.user_id = user.id AND wallet.currency = 'EUR'
         LEFT JOIN gift_redemptions reward ON reward.wallet_id = wallet.id
         WHERE user.id = ?
         GROUP BY user.id, wallet.available_balance_cents`,
      )
      .bind(userId)
      .first<{
        available_balance_cents: number;
        issued_reward_cents: number;
        reward_count: number;
      }>();

    return {
      availableBalanceCents: row?.available_balance_cents ?? 0,
      issuedRewardCents: row?.issued_reward_cents ?? 0,
      rewardCount: row?.reward_count ?? 0,
    };
  }

  async listRecent(): Promise<GiftRewardRow[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, external_id, status, provider_order_id, amount_cents,
                campaign_id, recipient_name, recipient_email, reward_reason, created_at
         FROM gift_redemptions
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .all<GiftRewardRow>();
    return rows.results;
  }

  async findByExternalId(externalId: string): Promise<GiftRewardRow | null> {
    return this.database
      .prepare(
        `SELECT id, external_id, status, provider_order_id, amount_cents,
                campaign_id, recipient_name, recipient_email, reward_reason, created_at
         FROM gift_redemptions WHERE external_id = ? LIMIT 1`,
      )
      .bind(externalId)
      .first<GiftRewardRow>();
  }
}
