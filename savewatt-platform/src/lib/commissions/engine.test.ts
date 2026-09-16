import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateCommissionCascade } from "./engine.ts";

describe("calculateCommissionCascade", () => {
  it("locks the network share at 66% and splits it 50/50", () => {
    const result = calculateCommissionCascade({ marginEurMwh: 10, volumeMwh: 100, rules: [] });
    assert.equal(result.totalMarginEur, 1000);
    assert.equal(result.symphonicsEur, 340);
    assert.equal(result.networkPoolEur, 660);
    assert.equal(result.axTechEur, 330);
    assert.equal(result.masterPoolEur, 330);
    assert.equal(result.lines.at(-1)?.amountEur, 330);
  });

  it("cascades configurable payouts from the master pool", () => {
    const result = calculateCommissionCascade({
      marginEurMwh: 20,
      volumeMwh: 100,
      rules: [
        { beneficiaryId: "team", label: "Équipe", percentageOfMasterPool: 20 },
        { beneficiaryId: "seller", label: "Apporteur", eurPerMwh: 0.5, signingPrimeEur: 25 },
      ],
    });
    assert.equal(result.lines.find((line) => line.beneficiaryId === "team")?.amountEur, 132);
    assert.equal(result.lines.find((line) => line.beneficiaryId === "seller")?.amountEur, 75);
    assert.equal(result.lines.at(-1)?.amountEur, 453);
  });

  it("rejects cascades that exceed the locked master pool", () => {
    assert.throws(() => calculateCommissionCascade({
      marginEurMwh: 10,
      volumeMwh: 100,
      rules: [{ beneficiaryId: "seller", label: "Apporteur", signingPrimeEur: 400 }],
    }), /exceeds/);
  });
});
