/**
 * Per-account commission shares.
 *
 * Every organization's rate is a percentage of its parent's share: SaveWatt
 * (the operator root) holds 100 % of the margin, a régie receives its rate of
 * that margin, a sous-régie receives its rate of the régie's share, and so on.
 * The rates of one parent's direct children may never add up to more than 100 %.
 *
 * Example: 100 € margin → régie at 30 % receives 30 € → its sous-régie at 50 %
 * receives 15 €, and the régie keeps 15 €.
 */

export interface CommissionRateNode {
  organizationId: string;
  parentId: string | null;
  /** Percentage of the parent's share; null when never configured (counts as 0). */
  ratePercent: number | null;
}

export interface CommissionShare {
  organizationId: string;
  parentId: string | null;
  ratePercent: number | null;
  /** Fraction of the root amount this organization receives (0–1). */
  shareOfRoot: number;
  /** Amount received out of `rootAmount`. */
  received: number;
  /** Amount kept after paying its direct children. */
  kept: number;
  /** Sum of the direct children's rates, in percent. */
  childrenRateTotal: number;
}

export const MAX_CHILDREN_RATE_TOTAL = 100;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Validates a single rate: a finite number between 0 and 100 with at most two decimals. */
export function isValidRatePercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-9
  );
}

/** True when the direct children's rates of one parent stay within 100 %. */
export function childrenRatesWithinLimit(rates: Array<number | null>): boolean {
  const total = rates.reduce<number>((sum, rate) => sum + (rate ?? 0), 0);
  return total <= MAX_CHILDREN_RATE_TOTAL + 1e-9;
}

/** Amount received at the end of a chain of rates (top-most first). */
export function amountAfterRates(amount: number, ratesFromTop: Array<number | null>): number {
  return ratesFromTop.reduce<number>((current, rate) => (current * (rate ?? 0)) / 100, amount);
}

/**
 * Computes every node's share starting from `rootId`, which receives the whole
 * `rootAmount` regardless of its own configured rate. Nodes outside the root's
 * subtree are ignored.
 */
export function computeCommissionShares(
  nodes: CommissionRateNode[],
  rootId: string,
  rootAmount: number,
): Map<string, CommissionShare> {
  const byParent = new Map<string, CommissionRateNode[]>();
  const root = nodes.find((node) => node.organizationId === rootId);
  const shares = new Map<string, CommissionShare>();
  if (!root) return shares;
  for (const node of nodes) {
    if (!node.parentId || node.organizationId === rootId) continue;
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  const visit = (node: CommissionRateNode, shareOfRoot: number) => {
    const children = byParent.get(node.organizationId) ?? [];
    const childrenRateTotal = round2(children.reduce((sum, child) => sum + (child.ratePercent ?? 0), 0));
    const received = rootAmount * shareOfRoot;
    const paidToChildren = children.reduce(
      (sum, child) => sum + (received * (child.ratePercent ?? 0)) / 100,
      0,
    );
    shares.set(node.organizationId, {
      organizationId: node.organizationId,
      parentId: node.parentId,
      ratePercent: node.ratePercent,
      shareOfRoot,
      received: round2(received),
      kept: round2(received - paidToChildren),
      childrenRateTotal,
    });
    for (const child of children) {
      if (shares.has(child.organizationId)) continue;
      visit(child, (shareOfRoot * (child.ratePercent ?? 0)) / 100);
    }
  };

  visit(root, 1);
  return shares;
}
