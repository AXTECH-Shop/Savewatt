import "server-only";

export interface TremendousOrderRequest {
  externalId: string;
  recipientEmail: string;
  recipientName: string;
  denomination: number;
  subject: string;
  message: string;
}

export interface TremendousOrder {
  id: string;
  externalId: string;
  status: string;
  raw: Record<string, unknown>;
}

export class TremendousConfigurationError extends Error {
  constructor() {
    super("TREMENDOUS_NOT_CONFIGURED");
  }
}

export class TremendousApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export class TremendousClient {
  private readonly baseUrl = (
    process.env.TREMENDOUS_BASE_URL ?? "https://testflight.tremendous.com/api/v2"
  ).replace(/\/$/, "");
  private readonly apiKey = process.env.TREMENDOUS_API_KEY;
  private readonly campaignId = process.env.TREMENDOUS_CAMPAIGN_ID;
  private readonly fundingSourceId = process.env.TREMENDOUS_FUNDING_SOURCE_ID ?? "BALANCE";

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.campaignId && !this.apiKey.includes("demo"));
  }

  getCampaignId(): string {
    if (!this.campaignId) throw new TremendousConfigurationError();
    return this.campaignId;
  }

  async createOrder(input: TremendousOrderRequest): Promise<TremendousOrder> {
    if (!this.isConfigured() || !this.apiKey || !this.campaignId) {
      throw new TremendousConfigurationError();
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: input.externalId,
        payment: {
          funding_source_id: this.fundingSourceId,
        },
        reward: {
          campaign_id: this.campaignId,
          value: {
            denomination: input.denomination,
            currency_code: "EUR",
          },
          recipient: {
            name: input.recipientName,
            email: input.recipientEmail,
          },
          language: "fr",
          delivery: {
            method: "EMAIL",
            meta: {
              sender_name: "SaveWatt",
              subject_line: input.subject,
              message: input.message,
            },
          },
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object") {
      throw new TremendousApiError(response.status, `TREMENDOUS_HTTP_${response.status}`);
    }

    const raw = payload as Record<string, unknown>;
    const order = raw.order;
    if (!order || typeof order !== "object") {
      throw new TremendousApiError(502, "TREMENDOUS_INVALID_RESPONSE");
    }

    const orderRecord = order as Record<string, unknown>;
    if (typeof orderRecord.id !== "string") {
      throw new TremendousApiError(502, "TREMENDOUS_INVALID_RESPONSE");
    }

    return {
      id: orderRecord.id,
      externalId: input.externalId,
      status: typeof orderRecord.status === "string" ? orderRecord.status : "OPEN",
      raw,
    };
  }
}