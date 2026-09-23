import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  TremendousApiError,
  TremendousClient,
  TremendousConfigurationError,
} from "@/lib/gifting/tremendous-client";
import { GiftRedemptionRepository } from "@/lib/gifting/gift-redemption-repository";
import {
  canIssueReward,
  isRewardReason,
  isValidRewardAmount,
} from "@/lib/gifting/reward-policy";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";

export const runtime = "nodejs";

interface IssueRewardBody {
  recipientUserId?: unknown;
  recipientKind?: unknown;
  benefitSelectionId?: unknown;
  amountCents?: unknown;
  reason?: unknown;
}

function externalIdFor(
  issuerUserId: string,
  recipientUserId: string,
  idempotencyKey: string,
): string {
  const digest = createHash("sha256")
    .update(`${issuerUserId}:${recipientUserId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 32);
  return `savewatt-admin-${digest}`;
}

export async function POST(request: Request) {
  let actor;
  try {
    actor = await resolveServerActor();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    throw error;
  }

  if (!canIssueReward(actor.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as IssueRewardBody;
  const recipientUserId =
    typeof body.recipientUserId === "string" ? body.recipientUserId.trim() : "";
  const recipientKind = body.recipientKind;
  const benefitSelectionId =
    typeof body.benefitSelectionId === "string" ? body.benefitSelectionId.trim() : undefined;
  const amountCents = Number(body.amountCents);
  if (
    !recipientUserId ||
    (recipientKind !== "PARTNER" && recipientKind !== "CUSTOMER") ||
    !isValidRewardAmount(amountCents) ||
    !isRewardReason(body.reason) ||
    (recipientKind === "CUSTOMER" && !benefitSelectionId) ||
    (recipientKind === "CUSTOMER" && body.reason !== "CUSTOMER_CHOICE") ||
    (recipientKind === "PARTNER" && body.reason === "CUSTOMER_CHOICE")
  ) {
    return NextResponse.json({ error: "INVALID_REWARD" }, { status: 400 });
  }

  const client = new TremendousClient();
  if (!client.isConfigured()) {
    return NextResponse.json({ error: "TREMENDOUS_NOT_CONFIGURED" }, { status: 503 });
  }

  const repository = new GiftRedemptionRepository();
  const recipient = await repository.findEligibleRecipient(
    recipientUserId,
    recipientKind,
    benefitSelectionId,
  );
  if (!recipient) {
    return NextResponse.json({ error: "RECIPIENT_NOT_ELIGIBLE" }, { status: 404 });
  }

  const externalId = externalIdFor(actor.userId, recipient.userId, idempotencyKey);
  const reward = await repository.createAdminIssuance({
    externalId,
    campaignId: client.getCampaignId(),
    issuedByUserId: actor.userId,
    recipient,
    amountCents,
    reason: body.reason,
  });
  if (!reward) {
    return NextResponse.json({ error: "REWARD_NOT_CREATED" }, { status: 409 });
  }

  if (reward.provider_order_id) {
    return NextResponse.json({
      rewardId: reward.id,
      orderId: reward.provider_order_id,
      status: reward.status,
    });
  }

  try {
    const order = await client.createOrder({
      externalId,
      recipientEmail: recipient.email,
      recipientName: recipient.displayName,
      denomination: amountCents / 100,
      subject: "Votre récompense SaveWatt",
      message: "Une récompense vous a été attribuée par l’administration SaveWatt.",
    });
    await repository.markIssued(externalId, order.id, order.raw);
    if (recipient.benefitSelectionId) {
      await repository.markCustomerSelectionIssued(recipient.benefitSelectionId, reward.id);
    }
    return NextResponse.json({ rewardId: reward.id, orderId: order.id, status: order.status });
  } catch (error) {
    await repository.markFailed(externalId);
    if (error instanceof TremendousConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof TremendousApiError) {
      return NextResponse.json({ error: error.code }, { status: 502 });
    }
    return NextResponse.json({ error: "TREMENDOUS_UNAVAILABLE" }, { status: 502 });
  }
}
