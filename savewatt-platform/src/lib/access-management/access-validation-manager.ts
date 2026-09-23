import { isAppRole, type AppRole } from "@/lib/access-control";
import { CrmError } from "@/lib/crm/crm-errors";
import { ORGANIZATION_KINDS, type OrganizationKind } from "./access-types";

export class AccessValidationManager {
  identifier(value: unknown, field = "id"): string {
    if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    return value;
  }

  text(value: unknown, field: string, max = 160): string {
    if (typeof value !== "string") throw new CrmError("CRM_INVALID_INPUT", 400, field);
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > max) throw new CrmError("CRM_INVALID_INPUT", 400, field);
    return normalized;
  }

  optionalText(value: unknown, field: string, max = 500): string | null {
    if (value === undefined || value === null || value === "") return null;
    return this.text(value, field, max);
  }

  email(value: unknown): string {
    const email = this.text(value, "email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "email");
    }
    return email;
  }

  role(value: unknown): AppRole {
    if (!isAppRole(value)) throw new CrmError("CRM_INVALID_INPUT", 400, "role");
    return value;
  }

  kind(value: unknown): OrganizationKind {
    if (typeof value !== "string" || !ORGANIZATION_KINDS.includes(value as OrganizationKind)) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "kind");
    }
    return value as OrganizationKind;
  }

  limit(value: unknown, field: string): number | null {
    if (value === undefined || value === null || value === "") return null;
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 10000) {
      throw new CrmError("CRM_INVALID_INPUT", 400, field);
    }
    return Number(value);
  }

  version(value: unknown): number {
    if (!Number.isInteger(value) || Number(value) < 1) {
      throw new CrmError("CRM_INVALID_INPUT", 400, "version");
    }
    return Number(value);
  }

  slug(value: string): string {
    const slug = value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
    if (!slug) throw new CrmError("CRM_INVALID_INPUT", 400, "name");
    return slug;
  }
}
