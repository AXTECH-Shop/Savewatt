import type { AppRole } from "@/lib/access-control";

export const REWARD_REASONS = [
  "PARTNER_REFERRAL",
  "PERFORMANCE_BONUS",
  "CUSTOMER_CHOICE",
  "MANUAL_ADJUSTMENT",
] as const;

export type RewardReason = (typeof REWARD_REASONS)[number];

export const PARTNER_REWARD_ROLES: AppRole[] = [
  "MASTER_ADMIN",
  "MASTER_BACKOFFICE",
  "SUB_REGIE_ADMIN",
  "TEAM_MANAGER",
  "APPORTEUR",
];

export function canIssueReward(role: AppRole): boolean {
  return role === "SUPER_ADMIN";
}

export function isRewardReason(value: unknown): value is RewardReason {
  return typeof value === "string" && REWARD_REASONS.includes(value as RewardReason);
}

export function isValidRewardAmount(amountCents: number): boolean {
  return (
    Number.isInteger(amountCents) &&
    amountCents >= 2_500 &&
    amountCents <= 250_000 &&
    amountCents % 100 === 0
  );
}
