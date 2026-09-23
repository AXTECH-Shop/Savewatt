export class CrmError extends Error {
  readonly code:
    | "CRM_FORBIDDEN"
    | "CRM_INVALID_INPUT"
    | "CRM_NOT_FOUND"
    | "CRM_CONFLICT"
    | "CRM_UNAVAILABLE";
  readonly status: number;
  readonly field?: string;

  constructor(
    code:
      | "CRM_FORBIDDEN"
      | "CRM_INVALID_INPUT"
      | "CRM_NOT_FOUND"
      | "CRM_CONFLICT"
      | "CRM_UNAVAILABLE",
    status: number,
    field?: string,
  ) {
    super(code);
    this.name = "CrmError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}
