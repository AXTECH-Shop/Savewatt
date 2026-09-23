import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canIssueReward,
  isRewardReason,
  isValidRewardAmount,
} from "./reward-policy.ts";

describe("reward policy", () => {
  it("allows only the SaveWatt super administrator to issue rewards", () => {
    assert.equal(canIssueReward("SUPER_ADMIN"), true);
    assert.equal(canIssueReward("OPERATOR_FINANCE"), false);
    assert.equal(canIssueReward("MASTER_ADMIN"), false);
    assert.equal(canIssueReward("TEAM_MANAGER"), false);
    assert.equal(canIssueReward("APPORTEUR"), false);
    assert.equal(canIssueReward("CLIENT"), false);
  });

  it("accepts only whole-euro rewards within the configured bounds", () => {
    assert.equal(isValidRewardAmount(2_500), true);
    assert.equal(isValidRewardAmount(250_000), true);
    assert.equal(isValidRewardAmount(2_499), false);
    assert.equal(isValidRewardAmount(2_550), false);
    assert.equal(isValidRewardAmount(250_100), false);
  });

  it("accepts only supported reward reasons", () => {
    assert.equal(isRewardReason("PARTNER_REFERRAL"), true);
    assert.equal(isRewardReason("CUSTOMER_CHOICE"), true);
    assert.equal(isRewardReason("SELF_REDEMPTION"), false);
  });
});
