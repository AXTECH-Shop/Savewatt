export const OFFER_DELIVERY_STATES = ["QUEUED", "SENT", "DELIVERED", "BOUNCED", "FAILED"] as const;

export type OfferDeliveryState = (typeof OFFER_DELIVERY_STATES)[number];

export function isTerminalDeliveryState(state: OfferDeliveryState): boolean {
  return state === "DELIVERED" || state === "BOUNCED" || state === "FAILED";
}

/**
 * Idempotent transition guard for provider callbacks, which may arrive
 * duplicated or out of order:
 * - a negative terminal (BOUNCED/FAILED) overrides anything except an
 *   already-recorded negative terminal (first failure wins);
 * - DELIVERED only advances QUEUED/SENT and never overwrites a negative
 *   terminal;
 * - anything else (duplicate or regressive) is ignored.
 */
export function shouldApplyDeliveryUpdate(
  current: OfferDeliveryState,
  incoming: OfferDeliveryState,
): boolean {
  if (current === incoming) return false;
  const negative = incoming === "BOUNCED" || incoming === "FAILED";
  if (current === "BOUNCED" || current === "FAILED") return false;
  if (negative) return true;
  if (incoming === "DELIVERED") return current === "QUEUED" || current === "SENT";
  return false;
}
