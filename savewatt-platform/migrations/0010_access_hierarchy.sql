PRAGMA foreign_keys = ON;

ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('ACTIVE', 'SUSPENDED'));
ALTER TABLE organizations ADD COLUMN max_child_organizations INTEGER
  CHECK (max_child_organizations IS NULL OR max_child_organizations >= 0);
ALTER TABLE organizations ADD COLUMN max_members INTEGER
  CHECK (max_members IS NULL OR max_members >= 1);
ALTER TABLE organizations ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE memberships ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE registration_requests ADD COLUMN decision_reason TEXT;
ALTER TABLE registration_requests ADD COLUMN target_organization_id TEXT
  REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE registration_requests ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE registration_requests ADD COLUMN review_claim TEXT;

CREATE TABLE organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'MASTER_ADMIN',
    'MASTER_BACKOFFICE',
    'SUB_REGIE_ADMIN',
    'TEAM_MANAGER',
    'APPORTEUR',
    'READ_ONLY',
    'CLIENT'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX organization_invitations_pending_email_idx
  ON organization_invitations(organization_id, lower(email))
  WHERE status = 'PENDING';
CREATE INDEX organization_invitations_email_status_idx
  ON organization_invitations(lower(email), status, expires_at);
CREATE INDEX organizations_status_path_idx
  ON organizations(status, path);
