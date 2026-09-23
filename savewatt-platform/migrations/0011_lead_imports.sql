PRAGMA foreign_keys = ON;

CREATE TABLE lead_imports (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  file_name TEXT,
  total_rows INTEGER NOT NULL,
  created_count INTEGER NOT NULL,
  skipped_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  row_results_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX lead_imports_org_idx
  ON lead_imports(organization_id, created_at DESC);
