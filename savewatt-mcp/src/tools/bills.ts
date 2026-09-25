import { randomUUID } from "node:crypto";
import { CrmError } from "@/lib/crm/crm-errors";
import { ExtractionRepository } from "@/lib/extraction/extraction-repository";
import { extractBill, GEMINI_MODEL } from "@/lib/extraction/gemini";
import type { ExtractionResult } from "@/lib/extraction/schema";
import type { ToolDef } from "./registry.ts";
import { ADMIN } from "./registry.ts";
import { num, obj, str } from "./validate.ts";

const EXTRACTABLE_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_EXTRACTABLE_BYTES = 10 * 1024 * 1024;

export const billTools: ToolDef[] = [
  {
    name: "bills.extract",
    description:
      "Run Gemini (Vertex AI) extraction on an attached bill document and persist the extraction row. " +
      "Surfaces provider errors cleanly (e.g. billing/quota failures).",
    status: "live",
    readOnly: false,
    scopes: ["bills:extract"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" } },
      required: ["documentId"],
    },
    run: async (ctx, args) => {
      const documentId = str(obj(args).documentId, "documentId", { required: true, max: 100 })!;
      const document = await ctx.documents.find(ctx.actor, documentId);
      if (!document) throw new CrmError("CRM_NOT_FOUND", 404);
      if (!EXTRACTABLE_MIME_TYPES.includes(document.mimeType)) {
        throw new CrmError("CRM_INVALID_INPUT", 415, "document");
      }
      if (document.byteSize > MAX_EXTRACTABLE_BYTES) {
        throw new CrmError("CRM_INVALID_INPUT", 413, "document");
      }
      // Same orchestration as ExtractionManager.run, but reads R2 through the
      // worker's own DOCUMENTS binding (DocumentStorageManager is coupled to
      // the Next/OpenNext runtime context).
      const object = await ctx.env.DOCUMENTS.get(document.r2Key);
      if (!object) throw new CrmError("CRM_NOT_FOUND", 404);
      const bytes = await new Response(object.body).arrayBuffer();
      const data = Buffer.from(bytes).toString("base64");

      const result = await extractBill({ data, mimeType: document.mimeType });
      const extractions = new ExtractionRepository(ctx.db, ctx.scopePolicy);
      const extraction = await extractions.create(ctx.actor, {
        documentId: document.id,
        dossierId: document.dossierId,
        model: GEMINI_MODEL,
        result,
      });
      await ctx.db
        .prepare(
          `INSERT INTO dossier_events (
             id, organization_id, dossier_id, actor_user_id, event_type, summary, metadata_json
           ) VALUES (?, ?, ?, ?, 'EXTRACTION_COMPLETED', 'EXTRACTION_COMPLETED', ?)`,
        )
        .bind(
          randomUUID(),
          ctx.actor.orgId,
          document.dossierId,
          ctx.actor.userId,
          JSON.stringify({
            documentId: document.id,
            extractionId: extraction.id,
            confidence: result.overallConfidence,
            warnings: result.warnings,
          }),
        )
        .run();
      return { extraction, warnings: result.warnings ?? [] };
    },
  },
  {
    name: "bills.extraction_status",
    description: "List extraction runs for a document, or get one extraction by id.",
    status: "live",
    readOnly: true,
    scopes: ["bills:read"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        extractionId: { type: "string" },
      },
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const extractionId = str(value.extractionId, "extractionId", { max: 100 });
      if (extractionId) {
        const found = await new ExtractionRepository(ctx.db, ctx.scopePolicy).find(ctx.actor, extractionId);
        if (!found) throw new CrmError("CRM_NOT_FOUND", 404);
        return { extraction: found };
      }
      const documentId = str(value.documentId, "documentId", { required: true, max: 100 })!;
      const extractions = await ctx.extractions.listForDocument(ctx.actor, documentId);
      return { extractions, count: extractions.length };
    },
  },
  {
    name: "bills.validate",
    description:
      "Persist a human-validated extraction (marks it VALIDATED; the offer engine consumes the latest VALIDATED extraction).",
    status: "live",
    readOnly: false,
    scopes: ["bills:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        extractionId: { type: "string" },
        bill: { type: "object", description: "ExtractionResult.bill — the (corrected) extracted bill." },
        fieldConfidence: { type: "array" },
        overallConfidence: { type: "number" },
        warnings: { type: "array", items: { type: "string" } },
      },
      required: ["extractionId", "bill"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const extractionId = str(value.extractionId, "extractionId", { required: true, max: 100 })!;
      const bill = obj(value.bill, "bill");
      const validated: ExtractionResult = {
        bill: bill as unknown as ExtractionResult["bill"],
        fieldConfidence: Array.isArray(value.fieldConfidence)
          ? (value.fieldConfidence as ExtractionResult["fieldConfidence"])
          : [],
        overallConfidence: num(value.overallConfidence, "overallConfidence", { min: 0, max: 1 }) ?? 1,
        warnings: Array.isArray(value.warnings)
          ? value.warnings.filter((w): w is string => typeof w === "string")
          : [],
      };
      const extraction = await ctx.extractions.saveValidated(ctx.actor, extractionId, validated);
      return { extraction };
    },
  },
];
