import { CrmError } from "@/lib/crm/crm-errors";

/** Manual argument validation, matching the platform's validation style. */

export function obj(value: unknown, field = "arguments"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  return value as Record<string, unknown>;
}

export function str(
  value: unknown,
  field: string,
  options: { max?: number; required?: boolean; pattern?: RegExp } = {},
): string | null {
  if (value === undefined || value === null || value === "") {
    if (options.required) throw new CrmError("CRM_INVALID_INPUT", 400, field);
    return null;
  }
  if (typeof value !== "string" || value.length > (options.max ?? 500)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  if (options.pattern && !options.pattern.test(value)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  return value;
}

export function num(
  value: unknown,
  field: string,
  options: { min?: number; max?: number; integer?: boolean; required?: boolean } = {},
): number | null {
  if (value === undefined || value === null) {
    if (options.required) throw new CrmError("CRM_INVALID_INPUT", 400, field);
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new CrmError("CRM_INVALID_INPUT", 400, field);
  if (options.integer && !Number.isInteger(parsed)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  if (options.min !== undefined && parsed < options.min) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  return parsed;
}

export function isoDate(value: unknown, field: string, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new CrmError("CRM_INVALID_INPUT", 400, field);
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  return value;
}

export function oneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  required = true,
): T | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new CrmError("CRM_INVALID_INPUT", 400, field);
    return null;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new CrmError("CRM_INVALID_INPUT", 400, field);
  }
  return value as T;
}
