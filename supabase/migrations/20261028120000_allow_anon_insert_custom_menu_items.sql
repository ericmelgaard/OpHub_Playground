/*
# Allow the app to create custom products
1. Security Changes
   - Add an INSERT policy on menu_items for anon, limited to rows marked
     source_name = 'converge-custom'. Synced Webtrition rows still come only
     from the edge function (service role).
   - This is a single-tenant demo app with no sign-in, so anon needs write access
     (same approach as brand_station_patterns).
2. Function Changes
   - update_product_availability() runs as SECURITY DEFINER so the availability
     row for a custom product can be written; anon has no direct write access
     to product_availability.
*/

DROP POLICY IF EXISTS "anon_insert_custom_menu_items" ON menu_items;
CREATE POLICY "anon_insert_custom_menu_items"
ON menu_items FOR INSERT
TO anon, authenticated
WITH CHECK (source_name = 'converge-custom');

ALTER FUNCTION update_product_availability() SECURITY DEFINER;
ALTER FUNCTION update_product_availability() SET search_path = public;
