PRAGMA foreign_keys = ON;

ALTER TABLE clients
ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

ALTER TABLE dossiers
ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  legal_name TEXT NOT NULL,
  siren TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  pdl TEXT,
  segment TEXT CHECK (segment IN ('C2', 'C3', 'C4', 'C5')),
  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW', 'QUALIFIED', 'CONVERTING', 'CONVERTED', 'LOST')),
  source TEXT,
  notes TEXT,
  conversion_token TEXT UNIQUE,
  converted_client_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,
  converted_site_id TEXT REFERENCES sites(id) ON DELETE RESTRICT,
  converted_dossier_id TEXT REFERENCES dossiers(id) ON DELETE RESTRICT,
  converted_at INTEGER,
  lost_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX leads_org_status_idx
  ON leads(organization_id, status, updated_at DESC);
CREATE INDEX leads_owner_idx
  ON leads(owner_user_id, status, updated_at DESC);
CREATE UNIQUE INDEX leads_converted_dossier_idx
  ON leads(converted_dossier_id)
  WHERE converted_dossier_id IS NOT NULL;

CREATE TABLE dossier_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX dossier_events_dossier_idx
  ON dossier_events(dossier_id, created_at DESC);
CREATE INDEX dossier_events_org_idx
  ON dossier_events(organization_id, created_at DESC);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  assignee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  due_at INTEGER,
  completed_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (dossier_id IS NOT NULL OR client_id IS NOT NULL)
);

CREATE INDEX tasks_assignee_status_idx
  ON tasks(assignee_user_id, status, due_at);
CREATE INDEX tasks_dossier_idx
  ON tasks(dossier_id, status, due_at);
CREATE INDEX tasks_client_idx
  ON tasks(client_id, status, due_at);
