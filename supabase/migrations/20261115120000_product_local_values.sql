/*
# Local values for products linked to a source
1. New Tables
   - `product_local_values`
     - `mrn` (text, primary key) - the product (its source item)
     - `local_values` (jsonb) - only the fields changed here, e.g. {"price": "4.25", "dayparts": ["Lunch"]}.
       Keys: name, description, price, calories, ingredients, allergens, icons, nutrition, dayparts.
       A field that isn't here follows the source.
     - `updated_at` (timestamptz)
   Every product is a WAND item. Editing one that's linked to a source saves a local value here and
   never changes the source; the sync doesn't touch this table. Custom products (not linked) are
   edited in place instead.
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in,
     same approach as product_dayparts).
*/

CREATE TABLE IF NOT EXISTS product_local_values (
  mrn text PRIMARY KEY,
  local_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_local_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_product_local_values" ON product_local_values;
CREATE POLICY "anon_read_product_local_values"
ON product_local_values FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_product_local_values" ON product_local_values;
CREATE POLICY "anon_insert_product_local_values"
ON product_local_values FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_product_local_values" ON product_local_values;
CREATE POLICY "anon_update_product_local_values"
ON product_local_values FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_product_local_values" ON product_local_values;
CREATE POLICY "anon_delete_product_local_values"
ON product_local_values FOR DELETE
TO anon, authenticated
USING (true);
