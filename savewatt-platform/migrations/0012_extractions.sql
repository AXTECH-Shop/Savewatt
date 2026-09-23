PRAGMA foreign_keys = ON;

CREATE TABLE extractions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'EXTRACTED'
    CHECK (status IN ('EXTRACTED', 'VALIDATED', 'REJECTED')),
  raw_json TEXT NOT NULL,
  field_confidence_json TEXT NOT NULL DEFAULT '[]',
  overall_confidence REAL,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  validated_json TEXT,
  validated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  validated_at INTEGER,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX extractions_document_idx
  ON extractions(document_id, created_at DESC);
CREATE INDEX extractions_dossier_idx
  ON extractions(dossier_id, created_at DESC);
