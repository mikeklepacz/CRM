ALTER TABLE apollo_companies
ADD COLUMN IF NOT EXISTS prescreen_contact_count integer NOT NULL DEFAULT 0;

ALTER TABLE apollo_companies
ADD COLUMN IF NOT EXISTS prescreen_people_preview jsonb NOT NULL DEFAULT '[]'::jsonb;
