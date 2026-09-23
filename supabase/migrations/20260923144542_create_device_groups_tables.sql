/*
# Create Device Groups System

1. New Tables
  - `device_groups`
    - `id` (uuid, primary key)
    - `name` (text) - Group display name
    - `description` (text, nullable) - Optional group description
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `device_group_members`
    - `id` (uuid, primary key)
    - `group_id` (uuid, FK to device_groups) - Which group
    - `device_id` (text) - Device identifier (matches mock device IDs)
    - `created_at` (timestamptz)
    - Unique constraint on (group_id, device_id)

  - `device_group_brands`
    - `id` (uuid, primary key)
    - `group_id` (uuid, FK to device_groups) - Which group
    - `brand_id` (integer, FK to brands) - Which brand is allowed
    - `created_at` (timestamptz)
    - Unique constraint on (group_id, brand_id)

2. Security
  - RLS enabled on all tables
  - Anon + authenticated SELECT (groups are public config)
  - Authenticated INSERT, UPDATE, DELETE
*/

-- device_groups
CREATE TABLE IF NOT EXISTS device_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE device_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_device_groups" ON device_groups;
CREATE POLICY "anon_select_device_groups" ON device_groups FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_device_groups" ON device_groups;
CREATE POLICY "auth_insert_device_groups" ON device_groups FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_device_groups" ON device_groups;
CREATE POLICY "auth_update_device_groups" ON device_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_device_groups" ON device_groups;
CREATE POLICY "auth_delete_device_groups" ON device_groups FOR DELETE TO authenticated USING (true);

-- device_group_members
CREATE TABLE IF NOT EXISTS device_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES device_groups(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_dgm_group ON device_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_dgm_device ON device_group_members(device_id);

ALTER TABLE device_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dgm" ON device_group_members;
CREATE POLICY "anon_select_dgm" ON device_group_members FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_dgm" ON device_group_members;
CREATE POLICY "auth_insert_dgm" ON device_group_members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_dgm" ON device_group_members;
CREATE POLICY "auth_update_dgm" ON device_group_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_dgm" ON device_group_members;
CREATE POLICY "auth_delete_dgm" ON device_group_members FOR DELETE TO authenticated USING (true);

-- device_group_brands
CREATE TABLE IF NOT EXISTS device_group_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES device_groups(id) ON DELETE CASCADE,
  brand_id integer NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_dgb_group ON device_group_brands(group_id);
CREATE INDEX IF NOT EXISTS idx_dgb_brand ON device_group_brands(brand_id);

ALTER TABLE device_group_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dgb" ON device_group_brands;
CREATE POLICY "anon_select_dgb" ON device_group_brands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_dgb" ON device_group_brands;
CREATE POLICY "auth_insert_dgb" ON device_group_brands FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_dgb" ON device_group_brands;
CREATE POLICY "auth_update_dgb" ON device_group_brands FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_dgb" ON device_group_brands;
CREATE POLICY "auth_delete_dgb" ON device_group_brands FOR DELETE TO authenticated USING (true);
