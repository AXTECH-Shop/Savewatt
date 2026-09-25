PRAGMA foreign_keys = ON;

-- Versioned, org-scoped pass-through pricing parameters (mirrors margin_grids
-- versioning). Rates validated against pdf2/pdf5, see specs/symphonics-pricing-model.md.
CREATE TABLE pricing_parameters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED')),
  cee_eur_mwh REAL NOT NULL CHECK (cee_eur_mwh >= 0),
  capacity_eur_mwh REAL NOT NULL CHECK (capacity_eur_mwh >= 0),
  accise_eur_mwh REAL NOT NULL DEFAULT 26.35 CHECK (accise_eur_mwh >= 0),
  cta_rate REAL NOT NULL DEFAULT 0.15 CHECK (cta_rate >= 0 AND cta_rate <= 1),
  tva_rate REAL NOT NULL DEFAULT 0.20 CHECK (tva_rate >= 0 AND tva_rate <= 1),
  turpe_fixed_json TEXT NOT NULL,
  turpe_variable_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX pricing_parameters_org_idx
  ON pricing_parameters(organization_id, status, effective_from);

-- Admin and régie margin grids coexist per org; régie grid max ≤ admin grid max
-- is enforced in MarginGridRepository (not expressible as a SQL CHECK).
ALTER TABLE margin_grids ADD COLUMN role_scope TEXT NOT NULL DEFAULT 'ADMIN'
  CHECK (role_scope IN ('ADMIN', 'REGIE'));

-- Customer-safe computed budget snapshot + second (marketing) PDF artifact.
ALTER TABLE offer_versions ADD COLUMN budget_json TEXT;
ALTER TABLE offer_versions ADD COLUMN pdf_marketing_r2_key TEXT;
ALTER TABLE offer_versions ADD COLUMN pdf_marketing_sha256 TEXT;

-- Seed: validated constants (Symphonics proposal pdf2 + EDF bill pdf5, TURPE 6).
INSERT INTO pricing_parameters (
  id, organization_id, version, status,
  cee_eur_mwh, capacity_eur_mwh, accise_eur_mwh, cta_rate, tva_rate,
  turpe_fixed_json, turpe_variable_json,
  effective_from, created_by_user_id
) VALUES (
  'pricing_seed_turpe6_2026',
  'org_savewatt',
  1,
  'ACTIVE',
  9.66,
  5.71,
  26.35,
  0.15,
  0.20,
  '{"gestionCentsPerDay":60.97,"comptageCentsPerDay":79.97,"soutirageFixeCentsPerKwPerDay":4.97}',
  '{"HPH":7.12,"HCH":4.34,"HPE":2.19,"HCE":1.57}',
  '2026-01-01',
  NULL
);
