import "server-only";

import { randomUUID } from "node:crypto";
import type { WorkspaceActor } from "@/lib/access-control";
import { DatabaseManager } from "@/lib/cloudflare/database-manager";
import { CrmError } from "./crm-errors";
import { CrmScopePolicy } from "./crm-scope-policy";
import type { CreateLeadInput, LeadRecord, LeadStatus } from "./crm-types";

interface LeadRow {
  id: string;
  organization_id: string;
  owner_user_id: string;
  owner_name: string;
  legal_name: string;
  siren: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  pdl: string | null;
  segment: LeadRecord["segment"];
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  converted_client_id: string | null;
  converted_site_id: string | null;
  converted_dossier_id: string | null;
  version: number;
  created_at: number;
  updated_at: number;
}

export interface ConversionResult {
  clientId: string;
  siteId: string;
  dossierId: string;
}

export class LeadRepository {
  constructor(
    private readonly database: D1Database = DatabaseManager.getDatabase(),
    private readonly scopePolicy = new CrmScopePolicy(),
  ) {}

  async list(actor: WorkspaceActor, status?: LeadStatus): Promise<LeadRecord[]> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "lead.owner_user_id");
    const statusClause = status ? "AND lead.status = ?" : "";
    const result = await this.database
      .prepare(`${this.selectSql()} WHERE ${scope.sql} ${statusClause} ORDER BY lead.updated_at DESC`)
      .bind(...scope.bindings, ...(status ? [status] : []))
      .all<LeadRow>();
    return (result.results ?? []).map((row) => this.map(row));
  }

  async find(actor: WorkspaceActor, leadId: string): Promise<LeadRecord | null> {
    const scope = this.scopePolicy.resourcePredicate(actor, "resource_org", "lead.owner_user_id");
    const row = await this.database
      .prepare(`${this.selectSql()} WHERE lead.id = ? AND ${scope.sql} LIMIT 1`)
      .bind(leadId, ...scope.bindings)
      .first<LeadRow>();
    return row ? this.map(row) : null;
  }

  async create(actor: WorkspaceActor, input: CreateLeadInput): Promise<LeadRecord> {
    this.scopePolicy.assertCanWrite(actor);
    const leadId = randomUUID();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO leads (
             id, organization_id, owner_user_id, legal_name, siren, contact_name,
             contact_email, contact_phone, pdl, segment, source, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          leadId,
          actor.orgId,
          actor.userId,
          input.legalName,
          input.siren ?? null,
          input.contactName ?? null,
          input.contactEmail ?? null,
          input.contactPhone ?? null,
          input.pdl ?? null,
          input.segment ?? null,
          input.source ?? null,
          input.notes ?? null,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type,
             resource_id, metadata_json
           ) VALUES (?, ?, ?, 'LEAD_CREATED', 'LEAD', ?, ?)`,
        )
        .bind(
          randomUUID(),
          actor.orgId,
          actor.userId,
          leadId,
          JSON.stringify({ legalName: input.legalName }),
        ),
    ]);
    const created = await this.find(actor, leadId);
    if (!created) throw new CrmError("CRM_NOT_FOUND", 404);
    return created;
  }

  async convert(actor: WorkspaceActor, leadId: string): Promise<ConversionResult> {
    this.scopePolicy.assertCanWrite(actor);
    const lead = await this.find(actor, leadId);
    if (!lead) throw new CrmError("CRM_NOT_FOUND", 404);
    if (lead.status === "CONVERTED" && lead.convertedClientId && lead.convertedSiteId && lead.convertedDossierId) {
      return {
        clientId: lead.convertedClientId,
        siteId: lead.convertedSiteId,
        dossierId: lead.convertedDossierId,
      };
    }
    if (lead.status !== "NEW" && lead.status !== "QUALIFIED") {
      throw new CrmError("CRM_CONFLICT", 409);
    }

    const conversionToken = randomUUID();
    const clientId = randomUUID();
    const siteId = randomUUID();
    const dossierId = randomUUID();
    const eventId = randomUUID();

    await this.database.batch([
      this.database
        .prepare(
          `UPDATE leads SET status = 'CONVERTING', conversion_token = ?,
             version = version + 1, updated_at = unixepoch()
           WHERE id = ? AND version = ? AND status IN ('NEW', 'QUALIFIED')`,
        )
        .bind(conversionToken, leadId, lead.version),
      this.database
        .prepare(
          `INSERT INTO clients (
             id, organization_id, owner_user_id, legal_name, siren,
             contact_name, contact_email, contact_phone
           )
           SELECT ?, organization_id, owner_user_id, legal_name, siren,
                  contact_name, contact_email, contact_phone
           FROM leads WHERE id = ? AND conversion_token = ? AND status = 'CONVERTING'`,
        )
        .bind(clientId, leadId, conversionToken),
      this.database
        .prepare(
          `INSERT INTO sites (id, organization_id, client_id, name, pdl, segment)
           SELECT ?, organization_id, ?, legal_name, pdl, segment
           FROM leads WHERE id = ? AND conversion_token = ? AND status = 'CONVERTING'`,
        )
        .bind(siteId, clientId, leadId, conversionToken),
      this.database
        .prepare(
          `INSERT INTO dossiers (
             id, organization_id, client_id, site_id, owner_user_id, status
           )
           SELECT ?, organization_id, ?, ?, owner_user_id, 'draft'
           FROM leads WHERE id = ? AND conversion_token = ? AND status = 'CONVERTING'`,
        )
        .bind(dossierId, clientId, siteId, leadId, conversionToken),
      this.database
        .prepare(
          `UPDATE leads SET status = 'CONVERTED', converted_client_id = ?,
             converted_site_id = ?, converted_dossier_id = ?, converted_at = unixepoch(),
             conversion_token = NULL, version = version + 1, updated_at = unixepoch()
           WHERE id = ? AND conversion_token = ? AND status = 'CONVERTING'`,
        )
        .bind(clientId, siteId, dossierId, leadId, conversionToken),
      this.database
        .prepare(
          `INSERT INTO dossier_events (
             id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
           ) SELECT ?, organization_id, id, ?, 'DOSSIER_CREATED', 'Dossier créé depuis un prospect', ?
             FROM dossiers WHERE id = ?`,
        )
        .bind(eventId, actor.userId, JSON.stringify({ leadId }), dossierId),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json
           ) SELECT ?, organization_id, ?, 'LEAD_CONVERTED', 'DOSSIER', ?, ?
             FROM dossiers WHERE id = ?`,
        )
        .bind(
          randomUUID(),
          actor.userId,
          dossierId,
          JSON.stringify({ leadId, clientId, siteId }),
          dossierId,
        ),
    ]);

    const converted = await this.find(actor, leadId);
    if (converted?.convertedDossierId !== dossierId) {
      throw new CrmError("CRM_CONFLICT", 409);
    }
    return { clientId, siteId, dossierId };
  }

  private selectSql(): string {
    return `SELECT lead.*, owner.display_name AS owner_name
      FROM leads lead
      JOIN organizations resource_org ON resource_org.id = lead.organization_id
      JOIN users owner ON owner.id = lead.owner_user_id`;
  }

  private map(row: LeadRow): LeadRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      legalName: row.legal_name,
      siren: row.siren,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      pdl: row.pdl,
      segment: row.segment,
      status: row.status,
      source: row.source,
      notes: row.notes,
      convertedClientId: row.converted_client_id,
      convertedSiteId: row.converted_site_id,
      convertedDossierId: row.converted_dossier_id,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
