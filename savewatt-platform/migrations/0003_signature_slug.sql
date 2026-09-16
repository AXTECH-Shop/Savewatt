ALTER TABLE signature_submissions
ADD COLUMN provider_submitter_slug TEXT;

CREATE UNIQUE INDEX signature_submitter_slug_idx
ON signature_submissions(provider, provider_submitter_slug)
WHERE provider_submitter_slug IS NOT NULL;
