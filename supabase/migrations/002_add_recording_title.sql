-- Add title column to recordings table
ALTER TABLE recordings ADD COLUMN title TEXT;

-- Comment on column
COMMENT ON COLUMN recordings.title IS 'Custom display title for the recording (optional). If present, overrides displayed name.';
