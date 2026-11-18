/*
# Site settings
1. New Tables
   - `site_settings`
     - `site_id` (text, primary key) - the site the settings are for. One demo site for now
       ('default'); it moves to the selected store when location selection is wired in.
     - `settings` (jsonb) - the settings, so more can be added without new columns.
       Today: `openDays` (array of day numbers, 0 = Sunday) - the days the business is open.
       Empty slots on closed days aren't counted as warnings. Missing = open every day.
     - `updated_at` (timestamptz)
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in,
     same approach as product_display_names).
*/

CREATE TABLE IF NOT EXISTS site_settings (
  site_id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_site_settings" ON site_settings;
CREATE POLICY "anon_read_site_settings"
ON site_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_site_settings" ON site_settings;
CREATE POLICY "anon_insert_site_settings"
ON site_settings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_site_settings" ON site_settings;
CREATE POLICY "anon_update_site_settings"
ON site_settings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_site_settings" ON site_settings;
CREATE POLICY "anon_delete_site_settings"
ON site_settings FOR DELETE
TO anon, authenticated
USING (true);
