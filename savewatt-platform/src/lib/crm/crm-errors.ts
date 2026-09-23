export type CrmErrorCode =
  | "CRM_FORBIDDEN"
  | "CRM_INVALID_INPUT"
  | "CRM_NOT_FOUND"
  | "CRM_CONFLICT"
  | "CRM_UNAVAILABLE"
  | "OFFER_INPUT_MISSING"
  | "OFFER_MARGIN_GRID_MISSING";

export class CrmError extends Error {
  readonly code: CrmErrorCode;
  readonly status: number;
  readonly field?: string;

  constructor(code: CrmErrorCode, status: number, field?: string) {
    super(code);
    this.name = "CrmError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}
