PRAGMA foreign_keys = ON;

-- Segment-aware pass-through rates and the Base / HP-HC → seasonal split profile.
ALTER TABLE pricing_parameters ADD COLUMN small_site_rates_json TEXT;
ALTER TABLE pricing_parameters ADD COLUMN consumption_profile_json TEXT;

-- New version for every organization's active set: ≤ 36 kVA (C5) rates read on
-- real C5 bills (TotalEnergies 08/2026, ENGIE 06/2026) and a profile averaged
-- from the Symphonics C5 quotes (Gibel, Expert Eco Isol). All editable in
-- Settings → Tarification.
INSERT INTO pricing_parameters (
  id, organization_id, version, status, cee_eur_mwh, capacity_eur_mwh, accise_eur_mwh,
  cta_rate, tva_rate, turpe_fixed_json, turpe_variable_json, effective_from, effective_to,
  small_site_rates_json, consumption_profile_json
)
SELECT
  params.id || '_c5',
  params.organization_id,
  (SELECT MAX(other.version) FROM pricing_parameters other WHERE other.organization_id = params.organization_id) + 1,
  'ACTIVE',
  params.cee_eur_mwh,
  params.capacity_eur_mwh,
  params.accise_eur_mwh,
  params.cta_rate,
  params.tva_rate,
  params.turpe_fixed_json,
  params.turpe_variable_json,
  '2026-01-01',
  params.effective_to,
  '{"acciseEurMwh":30.62,"turpeFixed":{"gestionCentsPerDay":4.69,"comptageCentsPerDay":6.21,"soutirageFixeCentsPerKwPerDay":2.855},"turpeVariable":{"HPH":7.5,"HCH":4.58,"HPE":1.71,"HCE":1.2}}',
  '{"HPH":41.1,"HCH":18,"HPE":30.1,"HCE":10.8}'
FROM pricing_parameters params
WHERE params.status = 'ACTIVE';

UPDATE pricing_parameters SET status = 'SUPERSEDED'
WHERE status = 'ACTIVE' AND small_site_rates_json IS NULL;
