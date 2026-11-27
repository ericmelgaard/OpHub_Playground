/*
# Local values for variants (menu platform spec v2.6 §6, F8)
1. New Tables
   - `variant_local_values`
     - `product_key` (text) - the product (`menu_items_condensed.mrn`: MRN, or `MRN|portion`)
     - `station_id` (integer) - the variant's meal station
     - `meal_period_id` (integer) - the variant's meal period (its daypart)
     - `local_values` (jsonb) - only the fields changed for this variant, e.g.
       {"name": "Pepperoni slice", "price": "3.49", "portion": "slice"}.
       Keys: name, description, price, portion, image. `portion` is how the size is shown here
       ("slice" for 1/8 pie); it never changes which product it is.
       A field that isn't here follows the product (its own local value, else the source).
     - `updated_at` (timestamptz)
     Primary key: (product_key, station_id, meal_period_id), the same as a variant and as
     `device_schedule_items.variant` (stationId, mealPeriodId).
   Layers, lowest first: source -> product local values (all variants) -> variant local values.
   The sync never touches this table.
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in, same approach as
     product_local_values).
*/

CREATE TABLE IF NOT EXISTS variant_local_values (
  product_key text NOT NULL,
  station_id integer NOT NULL,
  meal_period_id integer NOT NULL,
  local_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_key, station_id, meal_period_id)
);

ALTER TABLE variant_local_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_variant_local_values" ON variant_local_values;
CREATE POLICY "anon_read_variant_local_values"
ON variant_local_values FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_variant_local_values" ON variant_local_values;
CREATE POLICY "anon_insert_variant_local_values"
ON variant_local_values FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_variant_local_values" ON variant_local_values;
CREATE POLICY "anon_update_variant_local_values"
ON variant_local_values FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_variant_local_values" ON variant_local_values;
CREATE POLICY "anon_delete_variant_local_values"
ON variant_local_values FOR DELETE
TO anon, authenticated
USING (true);
