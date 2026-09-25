import { createHash, randomUUID } from "node:crypto";
import { CrmError } from "@/lib/crm/crm-errors";
import type { ToolDef } from "./registry.ts";
import { ADMIN } from "./registry.ts";
import { isoDate, num, obj, oneOf, str } from "./validate.ts";

const DOSSIER_STATUSES = ["draft", "uploaded", "analyzed", "proposalReady", "sent", "signed", "lost"] as const;
const DOCUMENT_KINDS = ["BILL", "CURRENT_CONTRACT", "SUPPLIER_OFFER"] as const;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const dossierTools: ToolDef[] = [
  {
    name: "dossiers.list",
    description: "List dossiers in scope, optionally filtered by status.",
    status: "live",
    readOnly: true,
    scopes: ["dossiers:read"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: [...DOSSIER_STATUSES] } },
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const status = oneOf(value.status, "status", DOSSIER_STATUSES, false);
      const dossiers = await ctx.crm.listDossiers(ctx.actor, status);
      return { dossiers, count: dossiers.length };
    },
  },
  {
    name: "dossiers.get",
    description: "Get a single dossier summary by id.",
    status: "live",
    readOnly: true,
    scopes: ["dossiers:read"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: { dossierId: { type: "string" } },
      required: ["dossierId"],
    },
    run: async (ctx, args) => {
      const dossierId = str(obj(args).dossierId, "dossierId", { required: true, max: 100 })!;
      const dossier = await ctx.crm.getDossier(ctx.actor, dossierId);
      if (!dossier) throw new CrmError("CRM_NOT_FOUND", 404);
      return { dossier };
    },
  },
  {
    name: "dossiers.create",
    description:
      "Create a dossier (lead + convert: creates client, site and dossier durably, same service as the UI).",
    status: "live",
    readOnly: false,
    scopes: ["dossiers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        legalName: { type: "string" },
        siren: { type: "string" },
        contactName: { type: "string" },
        contactEmail: { type: "string" },
        contactPhone: { type: "string" },
        pdl: { type: "string" },
        segment: { type: "string", enum: ["C2", "C3", "C4", "C5"] },
        source: { type: "string" },
        notes: { type: "string" },
      },
      required: ["legalName", "segment"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const dossier = await ctx.crm.createDossier(ctx.actor, {
        legalName: str(value.legalName, "legalName", { required: true, max: 200 }),
        siren: str(value.siren, "siren", { max: 9 }),
        contactName: str(value.contactName, "contactName", { max: 200 }),
        contactEmail: str(value.contactEmail, "contactEmail", { max: 200 }),
        contactPhone: str(value.contactPhone, "contactPhone", { max: 40 }),
        pdl: str(value.pdl, "pdl", { max: 14 }),
        segment: oneOf(value.segment, "segment", ["C2", "C3", "C4", "C5"] as const),
        source: str(value.source, "source", { max: 120 }) ?? "mcp",
        notes: str(value.notes, "notes", { max: 2000 }),
      });
      return { dossier };
    },
  },
  {
    name: "dossiers.transition_stage",
    description:
      "Advance a dossier through the status machine (same allowed transitions as the UI; optimistic version check).",
    status: "live",
    readOnly: false,
    scopes: ["dossiers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        status: { type: "string", enum: [...DOSSIER_STATUSES] },
        version: { type: "number", description: "Expected version; fetched when omitted." },
      },
      required: ["dossierId", "status"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const dossierId = str(value.dossierId, "dossierId", { required: true, max: 100 })!;
      const status = oneOf(value.status, "status", DOSSIER_STATUSES)!;
      let version = num(value.version, "version", { min: 1, integer: true });
      if (version === null) {
        const current = await ctx.crm.getDossier(ctx.actor, dossierId);
        if (!current) throw new CrmError("CRM_NOT_FOUND", 404);
        version = current.version;
      }
      const dossier = await ctx.crm.updateDossierStatus(ctx.actor, dossierId, { status, version });
      return { dossier };
    },
  },
  {
    name: "dossiers.attach_document",
    description:
      "Attach a document (PDF/image, ≤ 10 MB, magic-byte checked) to a dossier: R2 upload + durable metadata row.",
    status: "live",
    readOnly: false,
    scopes: ["dossiers:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        dossierId: { type: "string" },
        kind: { type: "string", enum: [...DOCUMENT_KINDS] },
        fileName: { type: "string" },
        mimeType: { type: "string", enum: ["application/pdf", "image/png", "image/jpeg", "image/webp"] },
        contentBase64: { type: "string", description: "Base64-encoded file bytes (≤ 10 MB decoded)." },
      },
      required: ["dossierId", "kind", "fileName", "mimeType", "contentBase64"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const dossierId = str(value.dossierId, "dossierId", { required: true, max: 100 })!;
      const kind = ctx.documentValidation.kind(str(value.kind, "kind", { required: true }));
      const mimeType = str(value.mimeType, "mimeType", { required: true })!;
      const fileName = ctx.documentValidation.safeFileName(
        str(value.fileName, "fileName", { required: true, max: 200 })!,
      );
      const contentBase64 = str(value.contentBase64, "contentBase64", { required: true, max: 15_000_000 })!;
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
      } catch {
        throw new CrmError("CRM_INVALID_INPUT", 400, "contentBase64");
      }
      if (bytes.length <= 0 || bytes.length > MAX_DOCUMENT_BYTES) {
        throw new CrmError("CRM_INVALID_INPUT", 400, "fileSize");
      }
      ctx.documentValidation.magicBytes(bytes, mimeType);

      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const r2Key = `dossiers/${dossierId}/${randomUUID()}-${fileName}`;
      const document = await ctx.documents.createPending(ctx.actor, {
        dossierId,
        kind,
        r2Key,
        fileName,
        mimeType,
        byteSize: bytes.length,
        sha256,
      });
      try {
        await ctx.env.DOCUMENTS.put(r2Key, bytes, {
          httpMetadata: { contentType: mimeType },
          customMetadata: { dossierId, documentId: document.id, sha256 },
        });
      } catch (error) {
        throw new CrmError("CRM_UNAVAILABLE", 502, "r2");
      }
      await ctx.documents.markAvailable(ctx.actor, document);
      return { document: { ...document, status: "AVAILABLE" }, r2Key, sha256 };
    },
  },
];

export const leadTools: ToolDef[] = [
  {
    name: "leads.list",
    description: "List leads in scope, optionally filtered by status.",
    status: "live",
    readOnly: true,
    scopes: ["leads:read"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["NEW", "QUALIFIED", "CONVERTING", "CONVERTED", "LOST"] },
      },
    },
    run: async (ctx, args) => {
      const status = oneOf(obj(args).status, "status", ["NEW", "QUALIFIED", "CONVERTING", "CONVERTED", "LOST"] as const, false);
      const leads = await ctx.crm.listLeads(ctx.actor, status);
      return { leads, count: leads.length };
    },
  },
  {
    name: "leads.create",
    description: "Create a lead durably (same service as the UI lead intake).",
    status: "live",
    readOnly: false,
    scopes: ["leads:write"],
    roles: ADMIN,
    inputSchema: {
      type: "object",
      properties: {
        legalName: { type: "string" },
        siren: { type: "string" },
        contactName: { type: "string" },
        contactEmail: { type: "string" },
        contactPhone: { type: "string" },
        pdl: { type: "string" },
        segment: { type: "string", enum: ["C2", "C3", "C4", "C5"] },
        source: { type: "string" },
        notes: { type: "string" },
      },
      required: ["legalName"],
    },
    run: async (ctx, args) => {
      const value = obj(args);
      const lead = await ctx.crm.createLead(ctx.actor, {
        legalName: str(value.legalName, "legalName", { required: true, max: 200 }),
        siren: str(value.siren, "siren", { max: 9 }),
        contactName: str(value.contactName, "contactName", { max: 200 }),
        contactEmail: str(value.contactEmail, "contactEmail", { max: 200 }),
        contactPhone: str(value.contactPhone, "contactPhone", { max: 40 }),
        pdl: str(value.pdl, "pdl", { max: 14 }),
        segment: oneOf(value.segment, "segment", ["C2", "C3", "C4", "C5"] as const, false),
        source: str(value.source, "source", { max: 120 }) ?? "mcp",
        notes: str(value.notes, "notes", { max: 2000 }),
      });
      return { lead };
    },
  },
];
