/*
# Add brand_id to stations table

1. Changes
  - Add `brand_id` (integer, nullable, FK to brands) to the `stations` table
  - This links each station to its parent brand for filtering
  - Index on brand_id for efficient brand-based queries

2. Notes
  - Existing stations get NULL brand_id initially
  - Brand matching will be run separately after fresh data is fetched
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'brand_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE stations ADD COLUMN brand_id integer REFERENCES brands(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stations_brand ON stations(brand_id);
