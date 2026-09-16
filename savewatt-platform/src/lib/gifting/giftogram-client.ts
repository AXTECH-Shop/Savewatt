import "server-only";

export interface GiftogramOrderRequest {
  externalId: string;
  recipientEmail: string;
  recipientName: string;
  denomination: number;
  subject: string;
  message: string;
  referenceNumber?: string;
}

export interface GiftogramOrder {
  id: string;
  externalId: string;
  status: string;
  raw: Record<string, unknown>;
}

export class GiftogramConfigurationError extends Error {
  constructor() {
    super("GIFTOGRAM_NOT_CONFIGURED");
  }
}

export class GiftogramApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export class GiftogramClient {
  private readonly baseUrl = (
    process.env.GIFTOGRAM_BASE_URL ?? "https://api.giftogram.com/api/v1"
  ).replace(/\/$/, "");
  private readonly apiKey = process.env.GIFTOGRAM_API_KEY;
  private readonly campaignId = process.env.GIFTOGRAM_CAMPAIGN_ID;

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.campaignId);
  }

  getCampaignId(): string {
    if (!this.campaignId) throw new GiftogramConfigurationError();
    return this.campaignId;
  }

  async createOrder(input: GiftogramOrderRequest): Promise<GiftogramOrder> {
    if (!this.apiKey || !this.campaignId) throw new GiftogramConfigurationError();

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: input.externalId,
        campaign_id: this.campaignId,
        reference_number: input.referenceNumber,
        subject: input.subject,
        message: input.message,
        recipients: [{ email: input.recipientEmail, name: input.recipientName }],
        denomination: input.denomination,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object") {
      throw new GiftogramApiError(response.status, `GIFTOGRAM_HTTP_${response.status}`);
    }

    const raw = payload as Record<string, unknown>;
    const id = raw.id ?? raw.order_id ?? raw.uuid;
    if (typeof id !== "string") {
      throw new GiftogramApiError(502, "GIFTOGRAM_INVALID_RESPONSE");
    }

    return {
      id,
      externalId: input.externalId,
      status: typeof raw.status === "string" ? raw.status : "created",
      raw,
    };
  }
}
