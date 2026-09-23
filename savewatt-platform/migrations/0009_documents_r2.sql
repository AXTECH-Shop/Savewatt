PRAGMA foreign_keys = ON;

ALTER TABLE documents
ADD COLUMN uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE documents
ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

CREATE INDEX documents_status_idx
  ON documents(status, created_at);

