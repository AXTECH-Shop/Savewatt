PRAGMA foreign_keys = ON;

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'TASK_DUE_REMINDER',
      'LEAD_FOLLOWUP_REMINDER',
      'DOSSIER_STATUS_CHANGED',
      'OFFER_DELIVERY_UPDATE'
    )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  dedupe_key TEXT NOT NULL,
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX notifications_user_idx
  ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX notifications_org_idx
  ON notifications(organization_id, created_at DESC);
