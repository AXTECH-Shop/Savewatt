PRAGMA foreign_keys = ON;

-- Sites above 36 kVA must send their current supply contract with the bill.
ALTER TABLE intake_submissions ADD COLUMN contract_r2_key TEXT;
ALTER TABLE intake_submissions ADD COLUMN contract_file_name TEXT;
ALTER TABLE intake_submissions ADD COLUMN contract_mime_type TEXT;
ALTER TABLE intake_submissions ADD COLUMN contract_byte_size INTEGER;
ALTER TABLE intake_submissions ADD COLUMN contract_sha256 TEXT;
