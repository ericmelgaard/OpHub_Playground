/*
# Dayparts for custom products
1. New Tables
   - `product_dayparts`
     - `mrn` (text, primary key) - the product's MRN (CUSTOM- products today)
     - `dayparts` (text[]) - the dayparts it may be offered at; no row means all dayparts
     - `updated_at` (timestamptz)
   Kept apart from menu_items (one daypart per row there) so a product can have several,
   and so the Webtrition sync never touches it.
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in,
     same approach as product_display_names).
*/

CREATE TABLE IF NOT EXISTS product_dayparts (
  mrn text PRIMARY KEY,
  dayparts text[] NOT NULL CHECK (cardinality(dayparts) > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_dayparts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_product_dayparts" ON product_dayparts;
CREATE POLICY "anon_read_product_dayparts"
ON product_dayparts FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_product_dayparts" ON product_dayparts;
CREATE POLICY "anon_insert_product_dayparts"
ON product_dayparts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_product_dayparts" ON product_dayparts;
CREATE POLICY "anon_update_product_dayparts"
ON product_dayparts FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_product_dayparts" ON product_dayparts;
CREATE POLICY "anon_delete_product_dayparts"
ON product_dayparts FOR DELETE
TO anon, authenticated
USING (true);
