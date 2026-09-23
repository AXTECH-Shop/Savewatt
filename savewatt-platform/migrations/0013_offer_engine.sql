PRAGMA foreign_keys = ON;

CREATE TABLE supplier_offers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  valid_until TEXT,
  term_years INTEGER NOT NULL DEFAULT 3 CHECK (term_years BETWEEN 1 AND 6),
  cee_eur_mwh REAL NOT NULL DEFAULT 0 CHECK (cee_eur_mwh >= 0),
  capacity_eur_mwh REAL NOT NULL DEFAULT 0 CHECK (capacity_eur_mwh >= 0),
  subscription_eur_month REAL NOT NULL DEFAULT 0 CHECK (subscription_eur_month >= 0),
  source_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX supplier_offers_dossier_idx
  ON supplier_offers(dossier_id);

CREATE TABLE supplier_offer_lines (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES supplier_offers(id) ON DELETE CASCADE,
  cadran TEXT NOT NULL,
  electron_eur_mwh REAL NOT NULL CHECK (electron_eur_mwh >= 0),
  annual_volume_mwh REAL NOT NULL CHECK (annual_volume_mwh >= 0)
);

CREATE INDEX supplier_offer_lines_offer_idx
  ON supplier_offer_lines(offer_id);

CREATE TABLE margin_grids (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED')),
  min_margin_eur_mwh REAL NOT NULL CHECK (min_margin_eur_mwh >= 0),
  default_margin_eur_mwh REAL NOT NULL CHECK (default_margin_eur_mwh >= 0),
  max_margin_eur_mwh REAL NOT NULL CHECK (max_margin_eur_mwh >= 0),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (min_margin_eur_mwh <= default_margin_eur_mwh),
  CHECK (default_margin_eur_mwh <= max_margin_eur_mwh)
);

CREATE INDEX margin_grids_org_idx
  ON margin_grids(organization_id, status, effective_from);

CREATE TABLE offer_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'APPROVAL_REQUIRED', 'APPROVED', 'SENT', 'EXPIRED', 'REVOKED')),
  current_contract_json TEXT NOT NULL,
  supplier_offer_json TEXT NOT NULL,
  margin_eur_mwh REAL NOT NULL CHECK (margin_eur_mwh >= 0),
  margin_override_reason TEXT,
  comparison_json TEXT NOT NULL,
  client_price_lines_json TEXT NOT NULL,
  legal_copy_json TEXT NOT NULL DEFAULT '{}',
  sha256 TEXT NOT NULL,
  pdf_r2_key TEXT,
  pdf_sha256 TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (dossier_id, version_no)
);

CREATE INDEX offer_versions_dossier_idx
  ON offer_versions(dossier_id, version_no DESC);

CREATE TABLE offer_deliveries (
  id TEXT PRIMARY KEY,
  offer_version_id TEXT NOT NULL REFERENCES offer_versions(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUEUED'
    CHECK (state IN ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED')),
  provider_message_id TEXT,
  error TEXT,
  sent_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX offer_deliveries_offer_idx
  ON offer_deliveries(offer_version_id, created_at DESC);
