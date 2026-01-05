-- Fix recording_coverage schema to support multi-segment recordings and match code conventions

-- 1. Remove UNIQUE constraint from recording_id to allow multiple segments per recording
ALTER TABLE recording_coverage DROP CONSTRAINT IF EXISTS recording_coverage_recording_id_key;

-- 2. Add surah_number column (Essential for multi-surah segments)
ALTER TABLE recording_coverage ADD COLUMN IF NOT EXISTS surah_number INTEGER;

-- 3. Rename columns to match 'recordings' table convention (ayah_start, ayah_end)
-- Check if column exists before renaming to avoid errors if run multiple times
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'recording_coverage' AND column_name = 'start_ayah') THEN
    ALTER TABLE recording_coverage RENAME COLUMN start_ayah TO ayah_start;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'recording_coverage' AND column_name = 'end_ayah') THEN
    ALTER TABLE recording_coverage RENAME COLUMN end_ayah TO ayah_end;
  END IF;
END $$;

-- 4. Update the constraint to use new column names
ALTER TABLE recording_coverage DROP CONSTRAINT IF EXISTS coverage_range_valid;
ALTER TABLE recording_coverage ADD CONSTRAINT coverage_range_valid CHECK (ayah_end >= ayah_start);
