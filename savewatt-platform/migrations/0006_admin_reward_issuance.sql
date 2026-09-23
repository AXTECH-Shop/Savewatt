ALTER TABLE gift_redemptions
ADD COLUMN issued_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE gift_redemptions
ADD COLUMN recipient_kind TEXT NOT NULL DEFAULT 'PARTNER'
CHECK (recipient_kind IN ('PARTNER', 'CUSTOMER'));

ALTER TABLE gift_redemptions
ADD COLUMN reward_reason TEXT
CHECK (reward_reason IN ('PARTNER_REFERRAL', 'PERFORMANCE_BONUS', 'CUSTOMER_CHOICE', 'MANUAL_ADJUSTMENT'));

CREATE INDEX gift_redemptions_issuer_idx
  ON gift_redemptions(issued_by_user_id, created_at DESC);

ALTER TABLE clients
ADD COLUMN customer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX clients_customer_user_idx
  ON clients(customer_user_id)
  WHERE customer_user_id IS NOT NULL;

CREATE TABLE customer_benefit_selections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  customer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('BILL_REDUCTION', 'GIFT_CARD')),
  status TEXT NOT NULL DEFAULT 'SELECTED' CHECK (status IN ('SELECTED', 'APPLIED', 'REWARD_ISSUED', 'CANCELLED')),
  reward_redemption_id TEXT REFERENCES gift_redemptions(id) ON DELETE SET NULL,
  selected_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (dossier_id)
);

CREATE INDEX customer_benefit_customer_idx
  ON customer_benefit_selections(customer_user_id, selected_at DESC);
