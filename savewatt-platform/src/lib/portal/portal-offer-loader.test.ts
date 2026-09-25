import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import {
  portalStateForStatus,
  recordOfferViewed,
  resolvePortalOffer,
  toPortalOfferView,
  type PortalOfferVersionRow,
} from "./portal-offer-loader.ts";
import { issuePortalToken } from "./portal-token.ts";

const SECRET = "test-portal-secret-0123456789abcdef";
const NOW = 1_800_000_000;

// Deliberately sensitive fixture: buy price 97.53, margin 12.34, CEE 9.66,
// capacity 5.71, org id and R2 keys — none of these may reach the portal view.
const SENSITIVE = {
  electron: 97.53,
  margin: 12.34,
  ceeRate: 9.66,
  capacityRate: 5.71,
  orgId: "org-internal-1",
  budgetKey: "offers/org-internal-1/d1/ov1/v1.pdf",
  marketingKey: "offers/org-internal-1/d1/ov1/v1-marketing.pdf",
};

function versionRow(status: string): PortalOfferVersionRow {
  return {
    id: "ov1",
    organization_id: SENSITIVE.orgId,
    dossier_id: "d1",
    version_no: 1,
    status: status as PortalOfferVersionRow["status"],
    current_contract_json: JSON.stringify({
      supplier: "EDF",
      offerName: "Tarif Bleu",
      endDate: "2026-12-31",
      subscriptionEurMonth: 42,
      subscribedPowerKva: 36,
      lines: [{ cadran: "HPH", unitPriceEurMwh: 140, volumeMwh: 29 }],
    }),
    client_price_lines_json: JSON.stringify([{ cadran: "HPH", priceEurMwh: 109.87 }]),
    comparison_json: JSON.stringify({
      rows: [
        {
          cadran: "HPH",
          currentEurMwh: 140,
          proposedEurMwh: 125.24,
          deltaEurMwh: 14.76,
          annualVolumeMwh: 29,
          gainPerYear: 428.04,
        },
      ],
      annualEnergySaving: 428.04,
      subscriptionSaving: 144,
      annualSaving: 2511,
      termSaving: 7533,
      termYears: 3,
      alerts: { winterMissing: false, hcOverHp: false, offerExpiring: false },
    }),
    budget_json: JSON.stringify({
      currency: "EUR",
      daysPerYear: 365,
      energy: {
        lines: [{ cadran: "HPH", volumeMwh: 29, rateEurMwh: 109.87, amountEur: 3186.23 }],
        totalEur: 3186,
      },
      subscription: { monthlyEur: 20, totalEur: 240 },
      cee: { rateEurMwh: SENSITIVE.ceeRate, volumeMwh: 29, totalEur: 280 },
      capacity: { rateEurMwh: SENSITIVE.capacityRate, volumeMwh: 29, totalEur: 166 },
      acheminement: {
        fixed: { gestionEur: 222.54, comptageEur: 291.89, soutirageFixeEur: 671.57, totalEur: 1186 },
        variable: {
          lines: [{ cadran: "HPH", volumeMwh: 29, rateCentsPerKwh: 7.12, amountEur: 2064.8 }],
          totalEur: 2904,
        },
        totalEur: 4090,
      },
      accise: { rateEurMwh: 26.35, volumeMwh: 29, totalEur: 764 },
      cta: { rate: 0.15, baseEur: 1186, totalEur: 178 },
      totalHtEur: 8808,
      tva: { rate: 0.2, totalEur: 1762 },
      totalTtcEur: 10570,
      termYears: 3,
      termTotalTtcEur: 31710,
      warnings: [],
    }),
    supplier_name: "Symphonics",
    valid_until: "2026-10-15",
    term_years: 3,
    subscription_eur_month: 20,
    pdf_r2_key: SENSITIVE.budgetKey,
    pdf_marketing_r2_key: SENSITIVE.marketingKey,
  };
}

interface FakeCall {
  sql: string;
  bindings: unknown[];
}

interface FakeResponder {
  match: RegExp;
  first?: Record<string, unknown> | null;
  runChanges?: number;
}

function fakeDatabase(responders: FakeResponder[]) {
  const calls: FakeCall[] = [];
  const database = {
    prepare(sql: string) {
      return {
        bind(...bindings: unknown[]) {
          calls.push({ sql, bindings });
          const responder = responders.find((candidate) => candidate.match.test(sql));
          return {
            first: async () => responder?.first ?? null,
            all: async () => ({ results: [] }),
            run: async () => ({ meta: { changes: responder?.runChanges ?? 1 } }),
          };
        },
      };
    },
  } as unknown as D1Database;
  return { database, calls };
}

const CLIENT_ROW = {
  legal_name: "Boulangerie Dupont",
  contact_name: "Marie Dupont",
  pdl: "50066947359734",
};

function readyResponders(row: PortalOfferVersionRow, viewedAt: number | null = null): FakeResponder[] {
  return [
    { match: /FROM offer_versions/, first: row as unknown as Record<string, unknown> },
    { match: /FROM dossiers/, first: CLIENT_ROW },
    { match: /FROM offer_deliveries/, first: { sent_at: NOW - 3600 } },
    { match: /MIN\(created_at\)/, first: { first_viewed_at: viewedAt } },
  ];
}

describe("portal status gating", () => {
  it("only exposes SENT versions", () => {
    assert.equal(portalStateForStatus("SENT"), "ready");
    assert.equal(portalStateForStatus("EXPIRED"), "offer-expired");
    assert.equal(portalStateForStatus("REVOKED"), "revoked");
    assert.equal(portalStateForStatus("DRAFT"), "unavailable");
    assert.equal(portalStateForStatus("APPROVAL_REQUIRED"), "unavailable");
    assert.equal(portalStateForStatus("APPROVED"), "unavailable");
  });
});

describe("portal offer view whitelisting", () => {
  const view = toPortalOfferView({
    row: versionRow("SENT"),
    client: CLIENT_ROW,
    sentAt: NOW - 3600,
    viewedAt: NOW - 60,
    recipientEmail: "marie@example.fr",
  });
  const serialized = JSON.stringify(view);

  it("keeps the customer-facing data", () => {
    assert.equal(view.clientName, "Boulangerie Dupont");
    assert.equal(view.pdl, "50066947359734");
    assert.equal(view.supplierName, "Symphonics");
    assert.equal(view.termYears, 3);
    assert.equal(view.annualSavingEur, 2511);
    assert.equal(view.priceLines[0].priceEurMwh, 109.87);
    assert.deepEqual(view.documents, { budget: true, marketing: true });
    assert.equal(view.budget?.totalTtcEur, 10570);
    assert.equal(view.budget?.ceeTotalEur, 280);
    assert.equal(view.sentAt, NOW - 3600);
    assert.equal(view.viewedAt, NOW - 60);
  });

  it("strips buy price, margin, component rates, org id and R2 keys", () => {
    for (const forbidden of [
      "electronEurMwh",
      "margin",
      "marginEurMwh",
      "marginOverrideReason",
      "ceeEurMwh",
      "capacityEurMwh",
      "rateCentsPerKwh",
      "pdf_r2_key",
      "pdfR2Key",
      "pdfMarketingR2Key",
      String(SENSITIVE.electron),
      String(SENSITIVE.margin),
      String(SENSITIVE.ceeRate),
      String(SENSITIVE.capacityRate),
      SENSITIVE.orgId,
      SENSITIVE.budgetKey,
      SENSITIVE.marketingKey,
    ]) {
      assert.ok(!serialized.includes(forbidden), `leaked: ${forbidden}`);
    }
    // Final client prices are margin-inclusive totals — allowed by design.
    assert.ok(serialized.includes("109.87"));
    // CEE/capacity appear only as euro totals, never as per-MWh rates.
    assert.ok(!("rateEurMwh" in (view.budget ?? {})));
  });

  it("tolerates a missing client row and missing budget", () => {
    const sparse = toPortalOfferView({
      row: { ...versionRow("SENT"), budget_json: null },
      client: null,
      sentAt: null,
      viewedAt: null,
      recipientEmail: "marie@example.fr",
    });
    assert.equal(sparse.clientName, "");
    assert.equal(sparse.budget, null);
    assert.deepEqual(sparse.documents, { budget: true, marketing: true });
  });
});

describe("portal offer resolution", () => {
  const previousSecret = process.env.PORTAL_TOKEN_SECRET;
  const realNow = Date.now;
  process.env.PORTAL_TOKEN_SECRET = SECRET;
  Date.now = () => NOW * 1000;
  const token = issuePortalToken(
    { offerVersionId: "ov1", recipientEmail: "marie@example.fr" },
    { nowSeconds: NOW, ttlSeconds: 3600 },
  );
  after(() => {
    Date.now = realNow;
    if (previousSecret === undefined) delete process.env.PORTAL_TOKEN_SECRET;
    else process.env.PORTAL_TOKEN_SECRET = previousSecret;
  });

  it("loads a SENT version, records the view and returns the whitelisted offer", async () => {
    const { database, calls } = fakeDatabase(readyResponders(versionRow("SENT")));
    const resolution = await resolvePortalOffer(token, { database });
    assert.equal(resolution.kind, "ready");
    if (resolution.kind !== "ready") return;
    assert.equal(resolution.offer.clientName, "Boulangerie Dupont");
    const inserts = calls.filter((call) => call.sql.includes("INSERT INTO dossier_events"));
    assert.equal(inserts.length, 1);
    // actor_user_id is a hardcoded NULL literal — the portal viewer is anonymous.
    assert.ok(inserts[0].sql.includes("NULL, 'OFFER_VIEWED'"));
    const metadata = JSON.parse(String(inserts[0].bindings[3]));
    assert.equal(metadata.offerVersionId, "ov1");
    assert.equal(metadata.recipientEmail, "marie@example.fr");
  });

  it("refuses non-SENT versions without leaking which state they are in", async () => {
    for (const [status, expected] of [
      ["DRAFT", "unavailable"],
      ["APPROVAL_REQUIRED", "unavailable"],
      ["APPROVED", "unavailable"],
      ["EXPIRED", "offer-expired"],
      ["REVOKED", "revoked"],
    ] as const) {
      const { database, calls } = fakeDatabase(readyResponders(versionRow(status)));
      const resolution = await resolvePortalOffer(token, { database });
      assert.equal(resolution.kind, expected, status);
      assert.equal(
        calls.filter((call) => call.sql.includes("INSERT INTO dossier_events")).length,
        0,
        `no view event for ${status}`,
      );
    }
  });

  it("returns unavailable for unknown offer versions and invalid for bad tokens", async () => {
    const { database } = fakeDatabase([{ match: /FROM offer_versions/, first: null }]);
    assert.equal((await resolvePortalOffer(token, { database })).kind, "unavailable");
    assert.equal((await resolvePortalOffer("tampered", { database })).kind, "invalid");
  });
});

describe("OFFER_VIEWED idempotency", () => {
  const input = {
    organizationId: "org1",
    dossierId: "d1",
    offerVersionId: "ov1",
    recipientEmail: "marie@example.fr",
  };

  it("inserts once per UTC day, then skips", async () => {
    const { database, calls } = fakeDatabase([
      { match: /created_at >=/, first: null }, // no event yet today
    ]);
    await recordOfferViewed(database, input, NOW);
    const inserts = calls.filter((call) => call.sql.includes("INSERT INTO dossier_events"));
    assert.equal(inserts.length, 1);

    const dayStart = Math.floor(NOW / 86_400) * 86_400;
    const existing = fakeDatabase([
      { match: /created_at >=/, first: { id: "evt1" } }, // already viewed today
    ]);
    await recordOfferViewed(existing.database, input, NOW);
    assert.equal(
      existing.calls.filter((call) => call.sql.includes("INSERT INTO dossier_events")).length,
      0,
    );
    // The day-start bound is what scopes idempotency.
    const check = calls.find((call) => call.sql.includes("created_at >="));
    assert.equal(check?.bindings[2], dayStart);
  });
});
