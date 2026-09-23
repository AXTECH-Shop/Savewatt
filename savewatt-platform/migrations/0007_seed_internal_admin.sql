PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO internal_user_whitelist (
  id,
  email,
  role,
  organization_id,
  status,
  created_by
) VALUES (
  'internal_contact_savewatt_fr',
  'contact@savewatt.fr',
  'SUPER_ADMIN',
  'org_savewatt',
  'ACTIVE',
  'system:migration:0007'
);

UPDATE internal_user_whitelist
SET role = 'SUPER_ADMIN',
    organization_id = 'org_savewatt',
    status = 'ACTIVE',
    updated_at = unixepoch()
WHERE lower(email) = 'contact@savewatt.fr';