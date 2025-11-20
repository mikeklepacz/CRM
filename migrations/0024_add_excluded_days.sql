-- Add excluded_days column to ehub_settings
ALTER TABLE "ehub_settings" ADD COLUMN "excluded_days" integer[] NOT NULL DEFAULT ARRAY[]::integer[];

-- Migrate existing skip_weekends data to excluded_days
-- If skip_weekends is true, set excluded_days to [0, 6] (Sunday and Saturday)
UPDATE "ehub_settings" SET "excluded_days" = ARRAY[0, 6]::integer[] WHERE "skip_weekends" = true;

-- Drop the skip_weekends column
ALTER TABLE "ehub_settings" DROP COLUMN "skip_weekends";
