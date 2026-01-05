-- Migration to add Arabic character normalization support for robust search

-- 1. Create a function to normalize Arabic text
-- Unifies Alef (أإآ -> ا), Taa Marbuta (ة -> ه), and Ya/Alif Maqsura (ى -> ي)
CREATE OR REPLACE FUNCTION normalize_arabic(text TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF text IS NULL THEN RETURN NULL; END IF;
    
    text := lower(trim(text));
    
    -- Remove Tashkeel
    text := regexp_replace(text, '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]', '', 'g');
    
    -- Unify Alef
    text := regexp_replace(text, '[أإآ]', 'ا', 'g');
    
    -- Unify Taa Marbuta with Haa
    text := regexp_replace(text, '[ة]', 'ه', 'g');
    
    -- Unify Ya with Alif Maqsura
    text := regexp_replace(text, '[ى]', 'ي', 'g');
    
    RETURN text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add normalized columns to reciters
ALTER TABLE reciters ADD COLUMN IF NOT EXISTS name_ar_normalized TEXT;

-- 3. Add normalized columns to recordings
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS title_normalized TEXT;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS city_normalized TEXT;

-- 4. Create trigger function to auto-update normalized columns
CREATE OR REPLACE FUNCTION update_normalized_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'reciters' THEN
        NEW.name_ar_normalized := normalize_arabic(NEW.name_ar);
    ELSIF TG_TABLE_NAME = 'recordings' THEN
        NEW.title_normalized := normalize_arabic(NEW.title);
        NEW.city_normalized := normalize_arabic(NEW.city);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach triggers
DROP TRIGGER IF EXISTS trg_normalize_reciters ON reciters;
CREATE TRIGGER trg_normalize_reciters
BEFORE INSERT OR UPDATE OF name_ar ON reciters
FOR EACH ROW EXECUTE FUNCTION update_normalized_columns();

DROP TRIGGER IF EXISTS trg_normalize_recordings ON recordings;
CREATE TRIGGER trg_normalize_recordings
BEFORE INSERT OR UPDATE OF title, city ON recordings
FOR EACH ROW EXECUTE FUNCTION update_normalized_columns();

-- 6. Backfill existing data
UPDATE reciters SET name_ar_normalized = normalize_arabic(name_ar);
UPDATE recordings SET 
    title_normalized = normalize_arabic(title),
    city_normalized = normalize_arabic(city);

-- 7. Add GIN indexes for fuzzy search (if extensions are available)
-- Using simple btree for now for exact normalized match support via ILIKE
CREATE INDEX IF NOT EXISTS idx_reciters_name_normalized ON reciters(name_ar_normalized);
CREATE INDEX IF NOT EXISTS idx_recordings_title_normalized ON recordings(title_normalized);
CREATE INDEX IF NOT EXISTS idx_recordings_city_normalized ON recordings(city_normalized);
