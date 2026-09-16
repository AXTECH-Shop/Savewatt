import { createHash } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  GiftogramApiError,
  GiftogramClient,
  GiftogramConfigurationError,
} from "@/lib/gifting/giftogram-client";
import { GiftRedemptionRepository } from "@/lib/gifting/gift-redemption-repository";

export const runtime = "nodejs";

interface RedemptionBody {
  amountCents?: unknown;
}

function externalIdFor(userId: string, idempotencyKey: string): string {
  const digest = createHash("sha256")
    .update(`${userId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 32);
  return `savewatt-${digest}`;
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHENTICATED_OR_NO_ORGANIZATION" }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as RedemptionBody;
  const amountCents = Number(body.amountCents);
  if (!Number.isInteger(amountCents) || amountCents < 2_500 || amountCents > 250_000) {
    return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
  }
  if (amountCents % 100 !== 0) {
    return NextResponse.json({ error: "WHOLE_EURO_AMOUNT_REQUIRED" }, { status: 400 });
  }

  const client = new GiftogramClient();
  if (!client.isConfigured()) {
    return NextResponse.json({ error: "GIFTOGRAM_NOT_CONFIGURED" }, { status: 503 });
  }

  const identity = await currentUser();
  const recipientEmail = identity?.primaryEmailAddress?.emailAddress;
  const recipientName = identity?.fullName ?? identity?.firstName ?? "Partenaire SaveWatt";
  if (!recipientEmail) {
    return NextResponse.json({ error: "PRIMARY_EMAIL_REQUIRED" }, { status: 409 });
  }

  const repository = new GiftRedemptionRepository();
  const organizationId = await repository.resolveOrganizationId(orgId, userId);
  if (!organizationId) {
    return NextResponse.json({ error: "ORGANIZATION_NOT_PROVISIONED" }, { status: 409 });
  }

  const externalId = externalIdFor(userId, idempotencyKey);
  const reservation = await repository.reserve({
    externalId,
    campaignId: client.getCampaignId(),
    recipientEmail,
    recipientName,
    amountCents,
    organizationId,
    userId,
  });
  if (!reservation) {
    return NextResponse.json({ error: "WALLET_NOT_PROVISIONED_OR_INSUFFICIENT" }, { status: 409 });
  }

  if (reservation.provider_order_id) {
    return NextResponse.json({
      redemptionId: reservation.id,
      orderId: reservation.provider_order_id,
      status: reservation.status,
    });
  }

  try {
    const order = await client.createOrder({
      externalId,
      recipientEmail,
      recipientName,
      denomination: amountCents / 100,
      subject: "Votre avantage SaveWatt",
      message: "<p>Votre avantage partenaire SaveWatt est disponible.</p>",
      referenceNumber: reservation.id.slice(0, 50),
    });
    await repository.markIssued(externalId, order.id, order.raw);
    return NextResponse.json({
      redemptionId: reservation.id,
      orderId: order.id,
      status: order.status,
    });
  } catch (error) {
    await repository.markFailedAndRelease(externalId);
    if (error instanceof GiftogramConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof GiftogramApiError) {
      return NextResponse.json({ error: error.code }, { status: 502 });
    }
    return NextResponse.json({ error: "GIFTOGRAM_UNAVAILABLE" }, { status: 502 });
  }
}
