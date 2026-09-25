PRAGMA foreign_keys = ON;

-- Standing Symphonics price sheet used to quote automatically from a bill
-- (ads → upload → offer by email). Versioned like pricing_parameters; CEE and
-- capacity come from the effective pricing_parameters set.
CREATE TABLE reference_supplier_terms (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED')),
  supplier TEXT NOT NULL DEFAULT 'Symphonics',
  term_years INTEGER NOT NULL CHECK (term_years BETWEEN 1 AND 6),
  subscription_eur_month REAL NOT NULL CHECK (subscription_eur_month >= 0),
  valid_until TEXT NOT NULL,
  prices_json TEXT NOT NULL,
  auto_send INTEGER NOT NULL DEFAULT 0 CHECK (auto_send IN (0, 1)),
  min_confidence REAL NOT NULL DEFAULT 0.8 CHECK (min_confidence BETWEEN 0 AND 1),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (organization_id, version)
);

CREATE INDEX reference_supplier_terms_active_idx
  ON reference_supplier_terms(organization_id, status, version DESC);

-- One row per bill received (public ad form or admin upload): tracks the
-- bill → lead → dossier → offer → email pipeline and why it stopped.
CREATE TABLE intake_submissions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL CHECK (channel IN ('PUBLIC_WEB', 'ADMIN')),
  status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (status IN ('RECEIVED', 'ANALYZED', 'OFFER_READY', 'OFFER_SENT', 'NEEDS_REVIEW', 'FAILED')),
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  file_r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  ip_hash TEXT,
  attribution_json TEXT NOT NULL DEFAULT '{}',
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE SET NULL,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  extraction_id TEXT REFERENCES extractions(id) ON DELETE SET NULL,
  offer_version_id TEXT REFERENCES offer_versions(id) ON DELETE SET NULL,
  issues_json TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX intake_submissions_org_idx
  ON intake_submissions(organization_id, status, created_at DESC);
CREATE INDEX intake_submissions_ip_idx
  ON intake_submissions(ip_hash, created_at DESC);
CREATE INDEX intake_submissions_email_idx
  ON intake_submissions(contact_email, created_at DESC);

-- Owner of leads/dossiers created by the public form (never signs in).
INSERT OR IGNORE INTO users (id, email, display_name, locale)
VALUES ('system_web_intake', 'web-intake@system.savewatt.fr', 'Formulaire web SaveWatt', 'fr');
