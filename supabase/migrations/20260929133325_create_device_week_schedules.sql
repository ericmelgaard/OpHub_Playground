/*
  # Create Device Week Schedules

  ## Overview
  Adds week-based scheduling for smart label devices. Each device can have
  a schedule per week (identified by Monday start date). Schedule items
  define which menu products appear on which device, for which daypart,
  on which day of the week.

  ## New Tables

  ### `device_week_schedules`
  Master record per device per week.
  - `id` (uuid, primary key)
  - `device_id` (text, not null) — references the device by its string ID
  - `week_start` (date, not null) — Monday of the target week
  - `status` (text) — 'draft', 'active', or 'published'
  - `source_type` (text) — 'manual', 'copied', or 'recurring'
  - `source_week_start` (date, nullable) — if copied, origin week
  - `is_recurring` (boolean, default false)
  - `recurrence_weeks` (integer, nullable) — interval in weeks (e.g. 2 = every 2 weeks)
  - `notes` (text, nullable) — user notes for this week
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `device_schedule_items`
  Individual item assignments within a week schedule.
  - `id` (uuid, primary key)
  - `schedule_id` (uuid) — FK to device_week_schedules
  - `daypart` (text, not null) — e.g. 'Breakfast', 'Lunch'
  - `day_of_week` (integer, 0-6) — 0=Sunday .. 6=Saturday
  - `menu_item_mrn` (text, not null) — product MRN reference
  - `menu_item_name` (text, not null) — snapshot of product name
  - `menu_item_price` (text) — snapshot of price
  - `sort_order` (integer, default 0)
  - `created_at` (timestamptz)

  ## Indexes
  - Unique constraint on (device_id, week_start) — one schedule per device per week
  - Index on schedule_id for fast item lookups
  - Composite index on (schedule_id, daypart, day_of_week)

  ## Security
  - RLS enabled on both tables
  - Anon + authenticated read/write (no auth in this app)
*/

-- device_week_schedules
CREATE TABLE IF NOT EXISTS device_week_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published')),
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'copied', 'recurring')),
  source_week_start date,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_weeks integer CHECK (recurrence_weeks IS NULL OR recurrence_weeks > 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(device_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_dws_device_id ON device_week_schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_dws_week_start ON device_week_schedules(week_start);

ALTER TABLE device_week_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dws" ON device_week_schedules;
CREATE POLICY "anon_select_dws" ON device_week_schedules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_dws" ON device_week_schedules;
CREATE POLICY "anon_insert_dws" ON device_week_schedules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_dws" ON device_week_schedules;
CREATE POLICY "anon_update_dws" ON device_week_schedules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_dws" ON device_week_schedules;
CREATE POLICY "anon_delete_dws" ON device_week_schedules FOR DELETE
  TO anon, authenticated USING (true);

-- device_schedule_items
CREATE TABLE IF NOT EXISTS device_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES device_week_schedules(id) ON DELETE CASCADE,
  daypart text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  menu_item_mrn text NOT NULL,
  menu_item_name text NOT NULL,
  menu_item_price text DEFAULT '0.00',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsi_schedule_id ON device_schedule_items(schedule_id);
CREATE INDEX IF NOT EXISTS idx_dsi_composite ON device_schedule_items(schedule_id, daypart, day_of_week);

ALTER TABLE device_schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dsi" ON device_schedule_items;
CREATE POLICY "anon_select_dsi" ON device_schedule_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_dsi" ON device_schedule_items;
CREATE POLICY "anon_insert_dsi" ON device_schedule_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_dsi" ON device_schedule_items;
CREATE POLICY "anon_update_dsi" ON device_schedule_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_dsi" ON device_schedule_items;
CREATE POLICY "anon_delete_dsi" ON device_schedule_items FOR DELETE
  TO anon, authenticated USING (true);
