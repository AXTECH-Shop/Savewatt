import "server-only";

import type { ComparisonResult } from "@/lib/compare";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import type { DossierStatus } from "@/lib/types";

export interface CustomerOfferSummary {
  versionNo: number;
  status: string;
  annualSaving: number;
  termYears: number;
  termSaving: number;
  /** Volume-weighted averages over comparable cadrans, €/MWh. */
  currentAvgEurMwh: number | null;
  proposedAvgEurMwh: number | null;
}

export interface CustomerDashboard {
  clientName: string;
  dossierId: string;
  dossierStatus: DossierStatus;
  offer: CustomerOfferSummary | null;
}

/**
 * Customer-safe summary of the customer's most recent dossier and the latest
 * approved/sent offer. Only comparison values that already appear on the
 * customer offer document are read (final prices and savings).
 */
export class CustomerDashboardRepository {
  private readonly database: D1Database;

  constructor(database?: D1Database) {
    this.database = database ?? DatabaseManager.getDatabase();
  }

  async getForUser(userId: string): Promise<CustomerDashboard | null> {
    const row = await this.database
      .prepare(
        `SELECT client.legal_name AS client_name, dossier.id AS dossier_id, dossier.status AS dossier_status,
                offer.version_no, offer.status AS offer_status, offer.comparison_json
         FROM clients client
         JOIN dossiers dossier ON dossier.client_id = client.id
         LEFT JOIN offer_versions offer ON offer.id = (
           SELECT candidate.id FROM offer_versions candidate
           WHERE candidate.dossier_id = dossier.id AND candidate.status IN ('APPROVED', 'SENT')
           ORDER BY candidate.version_no DESC LIMIT 1
         )
         WHERE client.customer_user_id = ?
         ORDER BY dossier.updated_at DESC
         LIMIT 1`,
      )
      .bind(userId)
      .first<{
        client_name: string;
        dossier_id: string;
        dossier_status: DossierStatus;
        version_no: number | null;
        offer_status: string | null;
        comparison_json: string | null;
      }>();
    if (!row) return null;
    return {
      clientName: row.client_name,
      dossierId: row.dossier_id,
      dossierStatus: row.dossier_status,
      offer:
        row.version_no !== null && row.comparison_json
          ? this.summarize(row.version_no, row.offer_status ?? "APPROVED", row.comparison_json)
          : null,
    };
  }

  private summarize(versionNo: number, status: string, json: string): CustomerOfferSummary | null {
    let comparison: ComparisonResult;
    try {
      comparison = JSON.parse(json) as ComparisonResult;
    } catch {
      return null;
    }
    const comparable = (comparison.rows ?? []).filter((item) => item.currentEurMwh !== null && item.annualVolumeMwh > 0);
    const volume = comparable.reduce((sum, item) => sum + item.annualVolumeMwh, 0);
    const average = (pick: (item: (typeof comparable)[number]) => number) =>
      volume > 0 ? comparable.reduce((sum, item) => sum + pick(item) * item.annualVolumeMwh, 0) / volume : null;
    return {
      versionNo,
      status,
      annualSaving: comparison.annualSaving,
      termYears: comparison.termYears,
      termSaving: comparison.termSaving,
      currentAvgEurMwh: average((item) => item.currentEurMwh ?? 0),
      proposedAvgEurMwh: average((item) => item.proposedEurMwh),
    };
  }
}
