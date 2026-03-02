-- Store additional free Apollo organization intelligence for downstream personalization
ALTER TABLE apollo_companies
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT[];

