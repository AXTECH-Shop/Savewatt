PRAGMA defer_foreign_keys = ON;

CREATE TABLE gift_redemptions_tremendous (
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

INSERT INTO gift_redemptions_tremendous (
  id, organization_id, user_id, wallet_id, provider, external_id, campaign_id,
  provider_order_id, recipient_email, recipient_name, amount_cents, status,
  provider_payload_json, created_at, updated_at
)
SELECT
  id, organization_id, user_id, wallet_id, 'TREMENDOUS', external_id, campaign_id,
  provider_order_id, recipient_email, recipient_name, amount_cents, status,
  provider_payload_json, created_at, updated_at
FROM gift_redemptions;

DROP TABLE gift_redemptions;
ALTER TABLE gift_redemptions_tremendous RENAME TO gift_redemptions;
CREATE INDEX gift_redemptions_user_idx ON gift_redemptions(user_id, created_at DESC);
CREATE INDEX gift_redemptions_order_idx ON gift_redemptions(provider_order_id);

CREATE TABLE provider_webhook_events_tremendous (
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

INSERT INTO provider_webhook_events_tremendous (
  id, provider, provider_event_key, event_type, payload_sha256, payload_json,
  status, received_at, processed_at, error_message
)
SELECT
  id,
  CASE WHEN provider = 'GIFTOGRAM' THEN 'TREMENDOUS' ELSE provider END,
  provider_event_key, event_type, payload_sha256, payload_json,
  status, received_at, processed_at, error_message
FROM provider_webhook_events;

DROP TABLE provider_webhook_events;
ALTER TABLE provider_webhook_events_tremendous RENAME TO provider_webhook_events;
CREATE INDEX webhook_status_idx ON provider_webhook_events(provider, status, received_at);

UPDATE wallet_transactions
SET source_type = CASE source_type
  WHEN 'GIFTOGRAM_ORDER' THEN 'TREMENDOUS_ORDER'
  WHEN 'GIFTOGRAM_RELEASE' THEN 'TREMENDOUS_RELEASE'
  ELSE source_type
END
WHERE source_type IN ('GIFTOGRAM_ORDER', 'GIFTOGRAM_RELEASE');