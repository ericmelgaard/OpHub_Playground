/*
# Display names for products
1. New Tables
   - `product_display_names`
     - `mrn` (text, primary key) - the product's MRN (Webtrition or CUSTOM-)
     - `display_name` (text) - what labels show instead of the product name
     - `updated_at` (timestamptz)
   Kept apart from menu_items so the Webtrition sync never overwrites it, and so
   imported products can have one without the app writing to synced rows.
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in,
     same approach as brand_station_patterns).
*/

CREATE TABLE IF NOT EXISTS product_display_names (
  mrn text PRIMARY KEY,
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_display_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_display_names" ON product_display_names;
CREATE POLICY "anon_read_display_names"
ON product_display_names FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_display_names" ON product_display_names;
CREATE POLICY "anon_insert_display_names"
ON product_display_names FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_display_names" ON product_display_names;
CREATE POLICY "anon_update_display_names"
ON product_display_names FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_display_names" ON product_display_names;
CREATE POLICY "anon_delete_display_names"
ON product_display_names FOR DELETE
TO anon, authenticated
USING (true);
