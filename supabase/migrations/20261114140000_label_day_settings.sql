/*
# Day settings for items on labels
1. New Tables
   - `label_day_settings`
     - `schedule_id` (uuid) - the week schedule it belongs to (a week override or the Default Week)
     - `daypart` (text) - the label page
     - `menu_item_mrn` (text) - the item
     - `day_of_week` (smallint, 0 = Sunday)
     - `state` (text) - 'on' or 'off'; no row means Auto (follow the source's days)
     - `updated_at` (timestamptz)
   Each item on a label has its own week. Settings on the Default Week are the item's base on
   that label; a week with its own schedule holds its own copy (copy, paste and recurring copy
   them with the items). Deleted with the schedule.
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in,
     same approach as device_schedule_items).
*/

CREATE TABLE IF NOT EXISTS label_day_settings (
  schedule_id uuid NOT NULL REFERENCES device_week_schedules(id) ON DELETE CASCADE,
  daypart text NOT NULL,
  menu_item_mrn text NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  state text NOT NULL CHECK (state IN ('on', 'off')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, daypart, menu_item_mrn, day_of_week)
);

ALTER TABLE label_day_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_label_day_settings" ON label_day_settings;
CREATE POLICY "anon_read_label_day_settings"
ON label_day_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_label_day_settings" ON label_day_settings;
CREATE POLICY "anon_insert_label_day_settings"
ON label_day_settings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_label_day_settings" ON label_day_settings;
CREATE POLICY "anon_update_label_day_settings"
ON label_day_settings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_label_day_settings" ON label_day_settings;
CREATE POLICY "anon_delete_label_day_settings"
ON label_day_settings FOR DELETE
TO anon, authenticated
USING (true);
