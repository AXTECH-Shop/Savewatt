ALTER TABLE wallet_accounts
ADD COLUMN available_balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (available_balance_cents >= 0);

ALTER TABLE wallet_accounts
ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());
