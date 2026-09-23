import type { Segment } from "@/lib/types";
import { CrmError } from "./crm-errors.ts";
import type { CreateDossierInput, CreateLeadInput, CreateTaskInput } from "./crm-types";

const SEGMENTS: Segment[] = ["C2", "C3", "C4", "C5"];
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PDL_PATTERN = /^\d{14}$/;
const SIREN_PATTERN = /^\d{9}$/;

export class CrmValidationManager {
  createLead(value: unknown): CreateLeadInput {
    const body = this.object(value);
    const legalName = this.requiredText(body.legalName, "legalName", 180);
    const siren = this.optionalDigits(body.siren, "siren", SIREN_PATTERN);
    const contactEmail = this.optionalText(body.contactEmail, "contactEmail", 254)?.toLowerCase();
    if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) this.invalid("contactEmail");
    const pdl = this.optionalDigits(body.pdl, "pdl", PDL_PATTERN);
    const segment = this.segment(body.segment, false);

    return {
      legalName,
      siren,
      contactName: this.optionalText(body.contactName, "contactName", 180),
      contactEmail,
      contactPhone: this.optionalText(body.contactPhone, "contactPhone", 40),
      pdl,
      segment,
      source: this.optionalText(body.source, "source", 120),
      notes: this.optionalText(body.notes, "notes", 4_000),
    };
  }

  createDossier(value: unknown): CreateDossierInput {
    const lead = this.createLead(value);
    const body = this.object(value);
    return { ...lead, segment: this.segment(body.segment, true)! };
  }

  createTask(value: unknown): CreateTaskInput {
    const body = this.object(value);
    const dossierId = this.optionalText(body.dossierId, "dossierId", 80);
    const clientId = this.optionalText(body.clientId, "clientId", 80);
    if (!dossierId && !clientId) this.invalid("dossierId");
    const dueAt = body.dueAt === undefined || body.dueAt === null
      ? undefined
      : Number(body.dueAt);
    if (dueAt !== undefined && (!Number.isInteger(dueAt) || dueAt <= 0)) {
      this.invalid("dueAt");
    }
    return {
      dossierId,
      clientId,
      assigneeUserId: this.optionalText(body.assigneeUserId, "assigneeUserId", 80),
      title: this.requiredText(body.title, "title", 240),
      description: this.optionalText(body.description, "description", 4_000),
      dueAt,
    };
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) this.invalid("body");
    return value as Record<string, unknown>;
  }

  private requiredText(value: unknown, field: string, max: number): string {
    const text = this.optionalText(value, field, max);
    if (!text) this.invalid(field);
    return text;
  }

  private optionalText(value: unknown, field: string, max: number): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string") this.invalid(field);
    const text = value.trim();
    if (!text || text.length > max) this.invalid(field);
    return text;
  }

  private optionalDigits(
    value: unknown,
    field: string,
    pattern: RegExp,
  ): string | undefined {
    const text = this.optionalText(value, field, 32)?.replace(/\s/g, "");
    if (text && !pattern.test(text)) this.invalid(field);
    return text;
  }

  private segment(value: unknown, required: boolean): Segment | undefined {
    if (!required && (value === undefined || value === null || value === "")) return undefined;
    if (typeof value !== "string" || !SEGMENTS.includes(value as Segment)) {
      this.invalid("segment");
    }
    return value as Segment;
  }

  private invalid(field: string): never {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
}
