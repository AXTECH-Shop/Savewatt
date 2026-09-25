PRAGMA foreign_keys = ON;

-- Launch defaults, reusing the validated Josh / Symphonics quote for every
-- customer until Symphonics sends a new price sheet. Both stay editable
-- (Settings → Tarifs Symphonics, Settings → Marges); each save is a new version.

INSERT INTO reference_supplier_terms (
  id, organization_id, version, status, supplier, term_years, subscription_eur_month,
  valid_until, prices_json, auto_send, min_confidence
)
SELECT 'reference_terms_josh_v1', 'org_savewatt', 1, 'ACTIVE', 'Symphonics', 3, 20,
  '2026-12-31', '{"HPH":140.48,"HCH":107.12,"HPE":77.4,"HCE":96.08}', 1, 0.8
WHERE EXISTS (SELECT 1 FROM organizations WHERE id = 'org_savewatt')
  AND NOT EXISTS (SELECT 1 FROM reference_supplier_terms WHERE organization_id = 'org_savewatt');

-- The operator (ADMIN) margin grid the Josh offer was priced with: 4 / 10 / 18 €/MWh.
INSERT INTO margin_grids (
  id, organization_id, version, status, role_scope,
  min_margin_eur_mwh, default_margin_eur_mwh, max_margin_eur_mwh, effective_from
)
SELECT 'margin_grid_admin_launch', 'org_savewatt',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM margin_grids WHERE organization_id = 'org_savewatt'),
  'ACTIVE', 'ADMIN', 4, 10, 18, '2026-01-01'
WHERE EXISTS (SELECT 1 FROM organizations WHERE id = 'org_savewatt')
  AND NOT EXISTS (
    SELECT 1 FROM margin_grids
    WHERE organization_id = 'org_savewatt' AND status = 'ACTIVE' AND role_scope = 'ADMIN'
  );
