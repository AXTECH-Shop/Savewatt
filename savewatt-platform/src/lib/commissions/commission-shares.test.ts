import assert from "node:assert/strict";
import test from "node:test";
import {
  amountAfterRates,
  childrenRatesWithinLimit,
  computeCommissionShares,
  isValidRatePercent,
} from "./commission-shares.ts";

const tree = [
  { organizationId: "savewatt", parentId: null, ratePercent: null },
  { organizationId: "regie-a", parentId: "savewatt", ratePercent: 30 },
  { organizationId: "regie-b", parentId: "savewatt", ratePercent: 20 },
  { organizationId: "sub-a1", parentId: "regie-a", ratePercent: 50 },
  { organizationId: "sub-a2", parentId: "regie-a", ratePercent: null },
];

test("100 € margin → régie 30 % → sous-régie 50 % gives 30 € then 15 €", () => {
  const shares = computeCommissionShares(tree, "savewatt", 100);
  assert.equal(shares.get("regie-a")?.received, 30);
  assert.equal(shares.get("sub-a1")?.received, 15);
  assert.equal(shares.get("regie-a")?.kept, 15);
  assert.equal(shares.get("sub-a2")?.received, 0);
  assert.equal(shares.get("savewatt")?.kept, 50);
  assert.equal(shares.get("savewatt")?.childrenRateTotal, 50);
  assert.equal(amountAfterRates(100, [30, 50]), 15);
});

test("a subtree root receives the full amount (régie view of its own commission)", () => {
  const shares = computeCommissionShares(tree, "regie-a", 100);
  assert.equal(shares.get("regie-a")?.received, 100);
  assert.equal(shares.get("sub-a1")?.received, 50);
  assert.equal(shares.has("regie-b"), false);
});

test("children rates must stay within 100 %", () => {
  assert.equal(childrenRatesWithinLimit([60, 40]), true);
  assert.equal(childrenRatesWithinLimit([60, 40.01]), false);
  assert.equal(childrenRatesWithinLimit([null, 100]), true);
});

test("rate validation accepts 0–100 with two decimals", () => {
  assert.equal(isValidRatePercent(0), true);
  assert.equal(isValidRatePercent(33.33), true);
  assert.equal(isValidRatePercent(100), true);
  assert.equal(isValidRatePercent(100.5), false);
  assert.equal(isValidRatePercent(-1), false);
  assert.equal(isValidRatePercent(12.345), false);
  assert.equal(isValidRatePercent(Number.NaN), false);
  assert.equal(isValidRatePercent("30"), false);
});
