import "server-only";

import { randomUUID } from "node:crypto";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";

export const CUSTOMER_BENEFIT_TYPES = ["BILL_REDUCTION", "GIFT_CARD"] as const;
export type CustomerBenefitType = (typeof CUSTOMER_BENEFIT_TYPES)[number];

export interface CustomerBenefitContext {
  dossierId: string;
  organizationId: string;
  clientName: string;
  benefitType: CustomerBenefitType | null;
  status: string | null;
}

export function isCustomerBenefitType(value: unknown): value is CustomerBenefitType {
  return (
    typeof value === "string" &&
    CUSTOMER_BENEFIT_TYPES.includes(value as CustomerBenefitType)
  );
}

export class CustomerBenefitRepository {
  constructor(private readonly database = DatabaseManager.getDatabase()) {}

  async getCurrentForUser(userId: string): Promise<CustomerBenefitContext | null> {
    const row = await this.database
      .prepare(
        `SELECT
           dossier.id AS dossier_id,
           dossier.organization_id,
           client.legal_name AS client_name,
           selection.benefit_type,
           selection.status
         FROM clients client
         JOIN dossiers dossier ON dossier.client_id = client.id
         LEFT JOIN customer_benefit_selections selection ON selection.dossier_id = dossier.id
         WHERE client.customer_user_id = ?
           AND dossier.status IN ('proposalReady', 'sent', 'signed')
         ORDER BY dossier.updated_at DESC
         LIMIT 1`,
      )
      .bind(userId)
      .first<{
        dossier_id: string;
        organization_id: string;
        client_name: string;
        benefit_type: CustomerBenefitType | null;
        status: string | null;
      }>();

    if (!row) return null;
    return {
      dossierId: row.dossier_id,
      organizationId: row.organization_id,
      clientName: row.client_name,
      benefitType: row.benefit_type,
      status: row.status,
    };
  }

  async selectForCustomer(
    userId: string,
    dossierId: string,
    benefitType: CustomerBenefitType,
  ): Promise<boolean> {
    const context = await this.database
      .prepare(
        `SELECT dossier.organization_id, selection.status AS selection_status
         FROM dossiers dossier
         JOIN clients client ON client.id = dossier.client_id
         LEFT JOIN customer_benefit_selections selection ON selection.dossier_id = dossier.id
         WHERE dossier.id = ?
           AND client.customer_user_id = ?
           AND dossier.status IN ('proposalReady', 'sent', 'signed')
         LIMIT 1`,
      )
      .bind(dossierId, userId)
      .first<{ organization_id: string; selection_status: string | null }>();
    if (!context || context.selection_status === "REWARD_ISSUED") return false;

    const selectionId = randomUUID();
    const auditId = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO customer_benefit_selections (
             id, organization_id, dossier_id, customer_user_id, benefit_type
           ) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(dossier_id) DO UPDATE SET
             benefit_type = excluded.benefit_type,
             status = 'SELECTED',
             reward_redemption_id = NULL,
             updated_at = unixepoch()`,
        )
        .bind(selectionId, context.organization_id, dossierId, userId, benefitType),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type,
             resource_id, metadata_json
           ) VALUES (?, ?, ?, 'CUSTOMER_BENEFIT_SELECTED', 'DOSSIER', ?, ?)`,
        )
        .bind(
          auditId,
          context.organization_id,
          userId,
          dossierId,
          JSON.stringify({ benefitType }),
        ),
    ]);
    return true;
  }
}
