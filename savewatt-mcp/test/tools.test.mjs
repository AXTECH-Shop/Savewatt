import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { D1Shim, fakeBrowser, fakeR2 } from "./helpers.mjs";

const d1 = new D1Shim();
const worker = (await import("../src/index.ts")).default;
const browserCalls = [];
const sentEmails = [];
const fakeEmail = {
  async send(message) {
    sentEmails.push(message);
    return { messageId: `msg-${sentEmails.length}-${Date.now()}` };
  },
};
const env = {
  DB: d1,
  DOCUMENTS: fakeR2(),
  BROWSER: fakeBrowser(browserCalls),
  EMAIL: fakeEmail,
  LINK_SECRET: "test-link-secret-0123456789",
};

async function rpc(method, params, { token = "mcp-test-valid" } = {}) {
  const response = await worker.fetch(
    new Request("https://mcp.test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    env,
  );
  return { status: response.status, body: await response.json().catch(() => null) };
}

const callTool = (name, args, opts) => rpc("tools/call", { name, arguments: args }, opts);

before(() => {
  // api_tokens seeded by auth.test.mjs (same DB file, same run).
});

describe("transport + auth", () => {
  it("rejects unauthenticated POST /mcp with 401", async () => {
    const { status, body } = await rpc("initialize", undefined, { token: null });
    assert.equal(status, 401);
    assert.equal(body.error, "UNAUTHENTICATED");
  });

  it("answers initialize with protocol version and server info", async () => {
    const { status, body } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    assert.equal(status, 200);
    assert.equal(body.result.serverInfo.name, "savewatt-mcp");
    assert.ok(body.result.protocolVersion);
    assert.ok(body.result.capabilities.tools);
  });

  it("returns 202 for notifications", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.test/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer mcp-test-valid" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      }),
      env,
    );
    assert.equal(response.status, 202);
  });

  it("rejects unknown methods with -32601", async () => {
    const { body } = await rpc("resources/list", {});
    assert.equal(body.error.code, -32601);
  });
});

describe("tools/list", () => {
  it("lists live tools with Claude-compatible names and hides planned tools", async () => {
    const { body } = await rpc("tools/list", {});
    const tools = body.result.tools;
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    for (const tool of tools) assert.match(tool.name, /^[a-zA-Z0-9_-]{1,64}$/);
    for (const name of [
      "dossiers_list", "dossiers_get", "dossiers_create", "dossiers_transition_stage", "dossiers_activity",
      "dossiers_attach_document", "bills_extract", "bills_extraction_status", "bills_validate", "bills_submit_reading",
      "supplier_offers_create_manual", "comparisons_run", "client_offers_create", "client_offers_list",
      "client_offers_approve", "client_offers_generate_pdf", "client_offers_send", "organizations_create_master",
      "margin_grids_create_version", "pricing_parameters_create_version", "audit_search",
      "leads_list", "leads_get", "leads_create", "leads_import", "leads_convert",
      "documents_create_upload_link", "documents_request_from_client", "pipeline_summary",
    ]) {
      assert.ok(byName.has(name), `missing live tool ${name}`);
    }
    assert.equal(byName.has("wallet_redeem"), false);
  });

  it("accepts both dotted and underscored names on tools/call", async () => {
    const dotted = await callTool("leads.list", {});
    const underscored = await callTool("leads_list", {});
    assert.ok(dotted.body.result.structuredContent.leads);
    assert.ok(underscored.body.result.structuredContent.leads);
  });
});

describe("planned tools", () => {
  it("are not callable", async () => {
    const { body } = await callTool("wallet.redeem", {});
    assert.equal(body.result.isError, true);
    assert.match(body.result.content[0].text, /planned/);
  });
});

describe("scope enforcement", () => {
  it("rejects a token missing the required scope", async () => {
    const { body } = await callTool("dossiers.create", { legalName: "X", segment: "C4" }, { token: "mcp-test-scoped" });
    assert.equal(body.result.isError, true);
    assert.equal(body.result.data?.code, "SCOPE_MISSING");
  });

  it("allows a scoped token to call tools inside its scope", async () => {
    const { body } = await callTool("dossiers.list", {}, { token: "mcp-test-scoped" });
    assert.ok(body.result.structuredContent.dossiers);
  });
});

describe("live tools against local D1", () => {
  let dossierId;

  it("leads.create writes a durable lead", async () => {
    const { body } = await callTool("leads.create", {
      legalName: "MCP Contract Test SARL",
      siren: "999888777",
      contactEmail: "ops@mcp.test",
      segment: "C4",
    });
    assert.ok(body.result.structuredContent.lead.id);
  });

  it("dossiers.create creates client+site+dossier, dossiers.list/get read it back", async () => {
    const created = await callTool("dossiers.create", {
      legalName: "MCP Contract Client",
      contactName: "Test Ops",
      contactEmail: "client@mcp.test",
      pdl: `500${String(Date.now()).slice(-11)}`,
      segment: "C4",
    });
    dossierId = created.body.result.structuredContent.dossier.id;
    assert.ok(dossierId);
    const listed = await callTool("dossiers.list", {});
    assert.ok(listed.body.result.structuredContent.dossiers.some((d) => d.id === dossierId));
    const got = await callTool("dossiers.get", { dossierId });
    assert.equal(got.body.result.structuredContent.dossier.id, dossierId);
  });

  it("dossiers.attach_document stores R2 bytes + AVAILABLE row with magic-byte check", async () => {
    const pdfBase64 = Buffer.from("%PDF-1.7 fake contract test").toString("base64");
    const { body } = await callTool("dossiers.attach_document", {
      dossierId,
      kind: "BILL",
      fileName: "facture test.pdf",
      mimeType: "application/pdf",
      contentBase64: pdfBase64,
    });
    const doc = body.result.structuredContent.document;
    assert.equal(doc.status, "AVAILABLE");
    assert.match(doc.fileName, /^facture-test\.pdf$/);
    const stored = await env.DOCUMENTS.get(body.result.structuredContent.r2Key);
    assert.ok(stored);
  });

  it("dossiers.attach_document rejects wrong magic bytes (415)", async () => {
    const { body } = await callTool("dossiers.attach_document", {
      dossierId,
      kind: "BILL",
      fileName: "evil.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from("not a pdf").toString("base64"),
    });
    assert.equal(body.result.isError, true);
    assert.match(body.result.content[0].text, /CRM_INVALID_INPUT/);
  });

  it("bills.extract surfaces provider configuration errors cleanly", async () => {
    const attached = await callTool("dossiers.attach_document", {
      dossierId,
      kind: "BILL",
      fileName: "bill.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from("%PDF-1.7 another").toString("base64"),
    });
    const documentId = attached.body.result.structuredContent.document.id;
    const { body } = await callTool("bills.extract", { documentId });
    assert.equal(body.result.isError, true);
    // No GCP signing key in the test env → clean configuration error, not a crash.
    assert.match(body.result.content[0].text, /GCP_WIF_PRIVATE_KEY|VERTEX_PROJECT_ID/);
  });

  it("client_offers.create runs the real engine on the seeded Josh dossier", async () => {
    const { body } = await callTool("client_offers.create", { dossierId: "dossier_josh_courtry" });
    const version = body.result.structuredContent.offerVersion;
    assert.ok(version.id);
    assert.equal(version.marginEurMwh, 10);
    assert.ok(version.budget.totalTtcEur > 16000);
  });

  it("comparisons.run returns comparison + budget preview without persisting", async () => {
    const { body } = await callTool("comparisons.run", { dossierId: "dossier_josh_courtry" });
    const data = body.result.structuredContent;
    assert.ok(data.comparison.annualSaving > 0);
    assert.equal(data.budgetPreview.totalTtcEur, 17561);
  });

  it("client_offers.generate_pdf archives both PDFs with download links; client_offers.send queues via Cloudflare Email", async () => {
    const created = await callTool("client_offers.create", { dossierId: "dossier_josh_courtry" });
    const versionId = created.body.result.structuredContent.offerVersion.id;
    const pdf = await callTool("client_offers_generate_pdf", { offerVersionId: versionId });
    const generated = pdf.body.result.structuredContent;
    assert.ok(generated.budgetR2Key.includes("-marketing") === false);
    assert.ok(generated.marketingR2Key.endsWith("-marketing.pdf"));
    assert.ok(browserCalls.length >= 2);

    const download = await worker.fetch(new Request(generated.marketingPdfUrl), env);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/pdf");
    const tampered = await worker.fetch(new Request(`${generated.marketingPdfUrl}x`), env);
    assert.equal(tampered.status, 410);

    const before = sentEmails.length;
    const sent = await callTool("client_offers_send", {
      offerVersionId: versionId,
      recipientEmail: "client@mcp.test",
      idempotencyKey: `mcp-test-${versionId}`,
    });
    const result = sent.body.result.structuredContent;
    assert.equal(result.state, "QUEUED");
    assert.equal(sentEmails.length, before + 1);
    assert.deepEqual(sentEmails.at(-1).to, ["client@mcp.test"]);
    assert.equal(sentEmails.at(-1).attachments.length, 2);
    assert.match(sentEmails.at(-1).attachments[0].filename, /^offre-savewatt/);

    const again = await callTool("client_offers_send", {
      offerVersionId: versionId,
      recipientEmail: "client@mcp.test",
      idempotencyKey: `mcp-test-${versionId}-2`,
    });
    assert.equal(again.body.result.isError, true);
    assert.match(again.body.result.content[0].text, /CRM_CONFLICT \(delivery\)/);

    const listed = await callTool("client_offers_list", { dossierId: "dossier_josh_courtry" });
    const listedVersion = listed.body.result.structuredContent.offerVersions.find((v) => v.id === versionId);
    assert.equal(listedVersion.deliveries[0].state, "QUEUED");
  });

  it("margin_grids.create_version publishes a REGIE grid capped by the ADMIN grid", async () => {
    const { body } = await callTool("margin_grids.create_version", {
      roleScope: "REGIE",
      minMarginEurMwh: 3,
      defaultMarginEurMwh: 8,
      maxMarginEurMwh: 15,
      effectiveFrom: "2026-09-25",
    });
    assert.equal(body.result.structuredContent.marginGrid.roleScope, "REGIE");
  });

  it("margin_grids.create_version rejects a REGIE max above the ADMIN ceiling", async () => {
    const { body } = await callTool("margin_grids.create_version", {
      roleScope: "REGIE",
      minMarginEurMwh: 3,
      defaultMarginEurMwh: 8,
      maxMarginEurMwh: 99,
      effectiveFrom: "2026-09-25",
    });
    assert.equal(body.result.isError, true);
    assert.match(body.result.content[0].text, /maxMarginEurMwh/);
  });

  it("pricing_parameters.create_version supersedes and returns a new version", async () => {
    const { body } = await callTool("pricing_parameters.create_version", {
      ceeEurMwh: 9.66,
      capacityEurMwh: 5.71,
      acciseEurMwh: 26.35,
      ctaRate: 0.15,
      tvaRate: 0.2,
      turpeFixed: { gestionCentsPerDay: 60.97, comptageCentsPerDay: 79.97, soutirageFixeCentsPerKwPerDay: 4.97 },
      turpeVariable: { HPH: 7.12, HCH: 4.34, HPE: 2.19, HCE: 1.57 },
      effectiveFrom: "2026-09-25",
    });
    const params = body.result.structuredContent.pricingParameters;
    assert.ok(params.version >= 2);
    assert.equal(params.status, "ACTIVE");
  });

  it("organizations.create_master creates a MASTER child org", async () => {
    const { body } = await callTool("organizations.create_master", { name: `MCP Test Régie ${Date.now()}` });
    const org = body.result.structuredContent.organization;
    assert.ok(org.id);
    assert.equal(org.kind, "MASTER");
  });

  it("audit.search finds MCP_TOOL_CALL rows written per call", async () => {
    const { body } = await callTool("audit.search", { action: "MCP_TOOL_CALL", limit: 5 });
    const events = body.result.structuredContent.events;
    assert.ok(events.length > 0);
    assert.ok(events.every((e) => e.action === "MCP_TOOL_CALL"));
    const metadata = JSON.parse(events[0].metadata_json);
    assert.ok(metadata.tool);
    assert.ok(metadata.paramsSha256);
  });
});

describe("Claude workflow: spreadsheet → documents → bill reading → tracking", () => {
  const run = String(Date.now()).slice(-8);
  const importKey = `import-${run}`;
  let dossierId;

  it("leads.import creates, de-duplicates (DB + within file) and reports invalid rows", async () => {
    const { body } = await callTool("leads_import", {
      idempotencyKey: importKey,
      fileName: "prospects.xlsx",
      rows: [
        { legalName: `Import A ${run}`, siren: `7${run}`, contactEmail: `a-${run}@mcp.test`, segment: "C4", annualSpend: 42000 },
        { legalName: `Import B ${run}`, contactEmail: `b-${run}@mcp.test`, pdl: "123" },
        { legalName: `Import A bis ${run}`, siren: `7${run}` },
        { legalName: "Duplicate of existing", siren: "999888777" },
      ],
    });
    const result = body.result.structuredContent;
    assert.equal(result.totalRows, 4);
    assert.equal(result.createdCount, 1);
    assert.equal(result.failedCount, 1);
    assert.equal(result.skippedCount, 2);
    assert.deepEqual(result.rows.find((row) => row.line === 3).fields, ["pdl"]);

    const replay = await callTool("leads_import", { idempotencyKey: importKey, rows: [{ legalName: "ignored" }] });
    assert.equal(replay.body.result.structuredContent.replayed, true);
    assert.equal(replay.body.result.structuredContent.createdCount, 1);
  });

  it("documents.request_from_client converts the lead and emails a working upload link", async () => {
    const leads = (await callTool("leads_list", { status: "NEW" })).body.result.structuredContent.leads;
    const lead = leads.find((entry) => entry.legalName === `Import A ${run}`);
    assert.ok(lead);
    const before = sentEmails.length;
    const { body } = await callTool("documents_request_from_client", { leadId: lead.id, message: "Merci !" });
    const result = body.result.structuredContent;
    dossierId = result.dossierId;
    assert.equal(result.recipientEmail, `a-${run}@mcp.test`);
    assert.equal(sentEmails.length, before + 1);
    assert.ok(sentEmails.at(-1).html.includes(result.uploadUrl));

    const page = await worker.fetch(new Request(result.uploadUrl), env);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Déposez votre dernière facture/);

    const form = new FormData();
    form.set("file", new File(["%PDF-1.7 client upload"], "facture client.pdf", { type: "application/pdf" }));
    const posted = await worker.fetch(new Request(result.uploadUrl, { method: "POST", body: form }), env);
    assert.equal(posted.status, 200);
    assert.match(await posted.text(), /bien reçu/);

    const spoofed = new FormData();
    spoofed.set("file", new File(["not a pdf"], "x.pdf", { type: "application/pdf" }));
    const rejected = await worker.fetch(new Request(result.uploadUrl, { method: "POST", body: spoofed }), env);
    assert.equal(rejected.status, 415);

    const invalid = await worker.fetch(new Request(`${result.uploadUrl}tampered`), env);
    assert.equal(invalid.status, 410);
  });

  it("dossiers.activity shows the request and the client upload", async () => {
    const { body } = await callTool("dossiers_activity", { dossierId });
    const result = body.result.structuredContent;
    const types = result.events.map((event) => event.eventType ?? event.event_type);
    assert.ok(types.includes("DOCUMENTS_REQUESTED"), JSON.stringify(types));
    assert.ok(types.includes("DOCUMENT_UPLOADED"));
    assert.ok(result.documents.some((document) => document.fileName === "facture-client.pdf"));
  });

  it("bills.submit_reading stores a VALIDATED extraction that feeds the offer engine", async () => {
    const { body } = await callTool("bills_submit_reading", {
      dossierId,
      sourceFileName: "facture-edf.pdf",
      bill: {
        supplier: "EDF",
        pdlOrPrm: "50066947359734",
        segment: "C4",
        subscribedPowerKva: 37,
        subscriptionPrinted: 32.5,
        subscriptionPrintedUnit: "€/mois",
        consumption: [
          { cadran: "HPE", volumeKwh: 5200, unitPricePrinted: 19.095, unitPricePrintedUnit: "c€/kWh" },
          { cadran: "HCE", volumeKwh: 800, unitPricePrinted: 11.354, unitPricePrintedUnit: "c€/kWh" },
        ],
      },
    });
    const result = body.result.structuredContent;
    assert.equal(result.extraction.status, "VALIDATED");
    const offerInput = await callTool("comparisons_run", { dossierId });
    // No supplier offer yet: the engine now sees the validated bill and only asks for the supplier offer.
    assert.match(offerInput.body.result.content[0].text, /supplierOffer/);
    const serialized = JSON.stringify(result.extraction);
    assert.match(serialized, /190\.95/);
    assert.match(serialized, /"subscriptionEurPerMonth":32\.5/);
  });

  it("documents.create_upload_link returns a signed link", async () => {
    const { body } = await callTool("documents_create_upload_link", { dossierId, kind: "CURRENT_CONTRACT", expiresInHours: 2 });
    const result = body.result.structuredContent;
    assert.match(result.uploadUrl, /^https:\/\/mcp\.test\/u\//);
    const page = await worker.fetch(new Request(result.uploadUrl), env);
    assert.match(await page.text(), /contrat d&#39;électricité actuel/);
  });

  it("pipeline.summary tallies leads, dossiers and deliveries", async () => {
    const { body } = await callTool("pipeline_summary", {});
    const result = body.result.structuredContent;
    assert.ok(result.leadsByStatus.CONVERTED >= 1);
    assert.ok(Object.keys(result.dossiersByStatus).length > 0);
    assert.ok((result.offerDeliveriesLast30Days.QUEUED ?? 0) >= 1);
  });
});
