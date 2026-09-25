PRAGMA foreign_keys = ON;

-- API tokens for the savewatt-mcp worker (PAT + service tokens).
-- Only SHA-256 hashes of secrets are stored; plaintext is shown once at creation.
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'PAT' CHECK (kind IN ('PAT', 'SERVICE')),
  label TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  expires_at INTEGER,
  last_used_at INTEGER,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at INTEGER
);

CREATE INDEX api_tokens_owner_idx
  ON api_tokens(owner_user_id, organization_id, status);
