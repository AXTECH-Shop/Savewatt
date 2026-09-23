PRAGMA foreign_keys = ON;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  clerk_org_id TEXT UNIQUE,
  parent_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('OPERATOR', 'MASTER', 'SUB_REGIE', 'TEAM')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  depth INTEGER NOT NULL CHECK (depth >= 0),
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX organizations_parent_idx ON organizations(parent_id);
CREATE INDEX organizations_path_idx ON organizations(path);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX users_email_idx ON users(lower(email));

CREATE TABLE memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'SUPER_ADMIN',
    'OPERATOR_FINANCE',
    'MASTER_ADMIN',
    'MASTER_BACKOFFICE',
    'SUB_REGIE_ADMIN',
    'TEAM_MANAGER',
    'APPORTEUR',
    'READ_ONLY',
    'CLIENT'
  )),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX memberships_user_idx ON memberships(user_id, status);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  legal_name TEXT NOT NULL,
  siren TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX clients_org_idx ON clients(organization_id, updated_at DESC);
CREATE INDEX clients_owner_idx ON clients(owner_user_id, updated_at DESC);
CREATE UNIQUE INDEX clients_org_siren_idx
  ON clients(organization_id, siren)
  WHERE siren IS NOT NULL;

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_json TEXT NOT NULL DEFAULT '{}',
  pdl TEXT,
  segment TEXT CHECK (segment IN ('C2', 'C3', 'C4', 'C5')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX sites_client_idx ON sites(client_id, updated_at DESC);
CREATE UNIQUE INDEX sites_pdl_idx ON sites(pdl) WHERE pdl IS NOT NULL;

CREATE TABLE dossiers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'uploaded',
    'analyzed',
    'proposalReady',
    'sent',
    'signed',
    'lost'
  )),
  current_contract_json TEXT,
  supplier_offer_json TEXT,
  client_offer_json TEXT,
  signed_at INTEGER,
  lost_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX dossiers_org_status_idx ON dossiers(organization_id, status, updated_at DESC);
CREATE INDEX dossiers_owner_idx ON dossiers(owner_user_id, updated_at DESC);
CREATE INDEX dossiers_client_idx ON dossiers(client_id, updated_at DESC);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'BILL',
    'CURRENT_CONTRACT',
    'SUPPLIER_OFFER',
    'CLIENT_OFFER',
    'SIGNED_CONTRACT',
    'AUDIT_TRAIL'
  )),
  r2_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('PENDING', 'AVAILABLE', 'QUARANTINED', 'ARCHIVED')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX documents_dossier_idx ON documents(dossier_id, kind, created_at DESC);

CREATE TABLE signature_submissions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('DOCUSEAL')),
  provider_submission_id TEXT NOT NULL,
  provider_submitter_id TEXT,
  signer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPENED', 'COMPLETED', 'DECLINED', 'EXPIRED')),
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (provider, provider_submission_id)
);

CREATE INDEX signature_dossier_idx ON signature_submissions(dossier_id, created_at DESC);

CREATE TABLE commission_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE RESTRICT,
  beneficiary_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  beneficiary_org_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  line_kind TEXT NOT NULL CHECK (line_kind IN ('MARGIN_SHARE', 'SIGNING_PRIME', 'CLAWBACK', 'ADJUSTMENT')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VALIDATED', 'VESTED', 'REVERSED')),
  source_key TEXT NOT NULL UNIQUE,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  validated_at INTEGER,
  vested_at INTEGER
);

CREATE INDEX commission_beneficiary_idx
  ON commission_lines(beneficiary_user_id, status, created_at DESC);
CREATE INDEX commission_dossier_idx ON commission_lines(dossier_id, created_at DESC);

CREATE TABLE wallet_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (organization_id, user_id, currency)
);

CREATE TABLE wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('COMMISSION_CREDIT', 'GIFT_REDEMPTION', 'REVERSAL', 'ADJUSTMENT')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (wallet_id, source_type, source_id)
);

CREATE INDEX wallet_transactions_wallet_idx ON wallet_transactions(wallet_id, created_at DESC);

CREATE TABLE gift_redemptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  wallet_id TEXT NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('TREMENDOUS')),
  external_id TEXT NOT NULL UNIQUE,
  campaign_id TEXT NOT NULL,
  provider_order_id TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ISSUED', 'DELIVERED', 'BOUNCED', 'FAILED', 'REFUNDED')),
  provider_payload_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX gift_redemptions_user_idx ON gift_redemptions(user_id, created_at DESC);
CREATE INDEX gift_redemptions_order_idx ON gift_redemptions(provider_order_id);

CREATE TABLE provider_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('DOCUSEAL', 'TREMENDOUS')),
  provider_event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
  received_at INTEGER NOT NULL DEFAULT (unixepoch()),
  processed_at INTEGER,
  error_message TEXT,
  UNIQUE (provider, provider_event_key)
);

CREATE INDEX webhook_status_idx ON provider_webhook_events(provider, status, received_at);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  ip_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX audit_resource_idx ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX audit_org_idx ON audit_events(organization_id, created_at DESC);

INSERT INTO organizations (id, kind, name, slug, path, depth)
VALUES ('org_savewatt', 'OPERATOR', 'SaveWatt — AX TECH', 'savewatt', 'org_savewatt', 0);
