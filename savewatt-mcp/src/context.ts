import type { WorkspaceActor } from "@/lib/access-control";
import { CrmManager } from "@/lib/crm/crm-manager";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import { CrmValidationManager } from "@/lib/crm/crm-validation-manager";
import { ActivityRepository } from "@/lib/crm/activity-repository";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { LeadRowImporter } from "@/lib/crm/lead-import-rows";
import { LeadRepository } from "@/lib/crm/lead-repository";
import type { EmailBinding } from "@/lib/email/email-sender";
import { DocumentRepository } from "@/lib/documents/document-repository";
import { DocumentValidationManager } from "@/lib/documents/document-validation-manager";
import { ExtractionManager } from "@/lib/extraction/extraction-manager";
import { ExtractionRepository } from "@/lib/extraction/extraction-repository";
import { MarginGridRepository } from "@/lib/offers/margin-grid-repository";
import { OfferManager } from "@/lib/offers/offer-manager";
import { OfferVersionRepository } from "@/lib/offers/offer-version-repository";
import { PricingParameterRepository } from "@/lib/offers/pricing-parameter-repository";
import { SupplierOfferRepository } from "@/lib/offers/supplier-offer-repository";
import { OrganizationManager } from "@/lib/access-management/organization-manager";
import { OrganizationRepository } from "@/lib/access-management/organization-repository";
import { AccessScopePolicy } from "@/lib/access-management/access-scope-policy";
import { AccessValidationManager } from "@/lib/access-management/access-validation-manager";
import type { ApiTokenRow } from "./auth.ts";

/** Worker env bindings (see wrangler.jsonc). Secrets arrive via `wrangler secret`. */
export interface McpEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  BROWSER: { fetch(input: string, init?: RequestInit): Promise<Response> };
  EMAIL?: EmailBinding;
  GEMINI_MODEL?: string;
  VERTEX_PROJECT_ID?: string;
  VERTEX_LOCATION?: string;
  GCP_WIF_PRIVATE_KEY?: string;
  /** HMAC secret for upload/download links. */
  LINK_SECRET?: string;
  CLERK_ISSUER?: string;
  CLERK_SECRET_KEY?: string;
}

const PROCESS_ENV_KEYS = [
  "GEMINI_MODEL",
  "VERTEX_PROJECT_ID",
  "VERTEX_LOCATION",
  "GCP_WIF_PRIVATE_KEY",
] as const;

/** Platform lib modules read process.env directly; mirror worker env into it. */
export function applyEnvToProcess(env: McpEnv): void {
  const processEnv = process.env as Record<string, string | undefined>;
  for (const key of PROCESS_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) processEnv[key] = value;
  }
}

export interface ToolContext {
  env: McpEnv;
  db: D1Database;
  actor: WorkspaceActor;
  token: ApiTokenRow;
  /** Public origin of this worker (for signed links). */
  origin: string;
  scopePolicy: CrmScopePolicy;
  crm: CrmManager;
  leads: LeadRepository;
  leadImporter: LeadRowImporter;
  offers: OfferManager;
  extractions: ExtractionManager;
  documents: DocumentRepository;
  documentValidation: DocumentValidationManager;
  marginGrids: MarginGridRepository;
  pricingParams: PricingParameterRepository;
  offerVersions: OfferVersionRepository;
  organizations: OrganizationManager;
}

export function buildToolContext(
  env: McpEnv,
  actor: WorkspaceActor,
  token: ApiTokenRow,
  origin: string,
): ToolContext {
  applyEnvToProcess(env);
  const db = env.DB;
  const scopePolicy = new CrmScopePolicy();
  const leads = new LeadRepository(db, scopePolicy);
  const documents = new DocumentRepository(db, scopePolicy);
  const extractionsRepo = new ExtractionRepository(db, scopePolicy);
  const dossiers = new DossierRepository(db, scopePolicy);
  const marginGrids = new MarginGridRepository(db, scopePolicy);
  const pricingParams = new PricingParameterRepository(db, scopePolicy);
  return {
    env,
    db,
    actor,
    token,
    origin,
    scopePolicy,
    leads,
    leadImporter: new LeadRowImporter(db, leads),
    crm: new CrmManager(
      leads,
      dossiers,
      new ActivityRepository(db, scopePolicy),
      new CrmValidationManager(),
    ),
    offers: new OfferManager(
      new SupplierOfferRepository(db, scopePolicy),
      marginGrids,
      pricingParams,
      new OfferVersionRepository(db, scopePolicy),
      dossiers,
      scopePolicy,
      db,
    ),
    extractions: new ExtractionManager(documents, extractionsRepo, db),
    documents,
    documentValidation: new DocumentValidationManager(),
    marginGrids,
    pricingParams,
    offerVersions: new OfferVersionRepository(db, scopePolicy),
    organizations: new OrganizationManager(
      new OrganizationRepository(db, new AccessScopePolicy()),
      new AccessScopePolicy(),
      new AccessValidationManager(),
    ),
  };
}
