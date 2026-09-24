/*
# Allow anon to insert and delete brand station patterns

1. Security Changes
   - Add INSERT and DELETE policies for anon role on brand_station_patterns
   - This is a single-tenant demo app with no sign-in, so anon needs write access
   - SELECT was already allowed for anon
*/

DROP POLICY IF EXISTS "anon_insert_brand_station_patterns" ON brand_station_patterns;
CREATE POLICY "anon_insert_brand_station_patterns"
ON brand_station_patterns FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_brand_station_patterns" ON brand_station_patterns;
CREATE POLICY "anon_delete_brand_station_patterns"
ON brand_station_patterns FOR DELETE
TO anon, authenticated USING (true);
