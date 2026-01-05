-- Support Non-Quranic Content
-- Relax constraints on Surah/Ayah columns to allow for general recordings (Inshad, Speeches, etc.)

ALTER TABLE recordings ALTER COLUMN surah_number DROP NOT NULL;
ALTER TABLE recordings ALTER COLUMN ayah_start DROP NOT NULL;
ALTER TABLE recordings ALTER COLUMN ayah_end DROP NOT NULL;

-- Update generated column metadata_complete to handle the new logic
-- It is complete IF:
-- (Legacy/Quran): Surah/Ayah are present
-- OR
-- (General): Title is present
-- AND common fields (Reciter, Section, File, Duration) are present.

ALTER TABLE recordings DROP COLUMN metadata_complete;

ALTER TABLE recordings ADD COLUMN metadata_complete BOOLEAN GENERATED ALWAYS AS (
  reciter_id IS NOT NULL AND
  section_id IS NOT NULL AND
  city IS NOT NULL AND
  duration_seconds IS NOT NULL AND
  source_description IS NOT NULL AND
  (
    (surah_number IS NOT NULL AND ayah_start IS NOT NULL AND ayah_end IS NOT NULL)
    OR
    (title IS NOT NULL)
  )
) STORED;
