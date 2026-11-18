/*
# Names for labels (devices)
1. New Tables
   - `device_names`
     - `device_id` (text, primary key) - the device's id
     - `name` (text) - the name people give the label ("Grill Station - 1"), shown before
       its device ID. No row = the device ID is the name.
     - `updated_at` (timestamptz)
   Kept apart from the device data so a device sync never overwrites it.
2. Security
   - RLS on; anon can read and write (single-tenant demo app with no sign-in,
     same approach as product_display_names).
*/

CREATE TABLE IF NOT EXISTS device_names (
  device_id text PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE device_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_device_names" ON device_names;
CREATE POLICY "anon_read_device_names"
ON device_names FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_device_names" ON device_names;
CREATE POLICY "anon_insert_device_names"
ON device_names FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_device_names" ON device_names;
CREATE POLICY "anon_update_device_names"
ON device_names FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_device_names" ON device_names;
CREATE POLICY "anon_delete_device_names"
ON device_names FOR DELETE
TO anon, authenticated
USING (true);

-- Demo names for the sample labels, the way a cafeteria team would name them.
-- Never overwrites a name someone already set.
INSERT INTO device_names (device_id, name) VALUES
  ('device-1',  'Dining Hall Entrance'),
  ('device-2',  'Food Court - Register 1'),
  ('device-3',  'Grill Station - 1'),
  ('device-4',  'Pizza Station - 1'),
  ('device-5',  'Chef Specials'),
  ('device-6',  'Hospital Cafe - Counter'),
  ('device-7',  'Hot Line - Menu Board'),
  ('device-8',  'Salad Bar'),
  ('device-9',  'ED Vending - Lobby'),
  ('device-10', 'Union Ice Cream Cooler'),
  ('device-11', 'Gift Shop Cooler'),
  ('device-12', 'Bakery Case - 1'),
  ('device-13', 'Cold Case - Grab and Go')
ON CONFLICT (device_id) DO NOTHING;
