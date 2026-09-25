PRAGMA foreign_keys = ON;

-- Five product roles (admin, régie, sous-régie, apporteur, client): fold legacy role values.
UPDATE memberships SET role = 'SUPER_ADMIN', updated_at = unixepoch() WHERE role = 'OPERATOR_FINANCE';
UPDATE memberships SET role = 'MASTER_ADMIN', updated_at = unixepoch() WHERE role IN ('MASTER_BACKOFFICE', 'READ_ONLY');
UPDATE memberships SET role = 'SUB_REGIE_ADMIN', updated_at = unixepoch() WHERE role = 'TEAM_MANAGER';
UPDATE internal_user_whitelist SET role = 'SUPER_ADMIN', updated_at = unixepoch() WHERE role = 'OPERATOR_FINANCE';
UPDATE organization_invitations SET role = 'MASTER_ADMIN' WHERE role IN ('MASTER_BACKOFFICE', 'READ_ONLY');
UPDATE organization_invitations SET role = 'SUB_REGIE_ADMIN' WHERE role = 'TEAM_MANAGER';

-- Per-account commission: an organization's share, as a percentage of its parent's share
-- (a régie's rate is a percentage of the SaveWatt margin). Versioned: one ACTIVE row per org.
CREATE TABLE commission_rates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rate_percent REAL NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  version INTEGER NOT NULL CHECK (version >= 1),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED')),
  note TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  superseded_at INTEGER,
  UNIQUE (organization_id, version)
);

CREATE UNIQUE INDEX commission_rates_active_idx
  ON commission_rates(organization_id) WHERE status = 'ACTIVE';

-- Commercial workflow (pipeline stage labels, order, SLA) per organization, versioned.
CREATE TABLE workflow_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED')),
  stages_json TEXT NOT NULL,
  note TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  superseded_at INTEGER,
  UNIQUE (organization_id, version)
);

CREATE UNIQUE INDEX workflow_versions_active_idx
  ON workflow_versions(organization_id) WHERE status = 'ACTIVE';
