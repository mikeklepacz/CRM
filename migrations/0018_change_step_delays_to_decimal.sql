-- Change step_delays from integer[] to numeric[] to support decimal values for testing
-- This allows delays like 0.0035 days (5 minutes) for quick testing
ALTER TABLE sequences ALTER COLUMN step_delays TYPE numeric(10,4)[] USING step_delays::numeric(10,4)[];

COMMENT ON COLUMN sequences.step_delays IS 'Array of gap delays (each is days AFTER previous step). Supports decimals for testing.';
