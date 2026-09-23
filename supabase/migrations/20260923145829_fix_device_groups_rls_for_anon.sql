/*
# Fix device groups RLS for anon access

The app has no login -- all operations run as the anon role.
Write policies on device_groups, device_group_members, and device_group_brands
must allow anon, not just authenticated.
*/

-- device_groups
DROP POLICY IF EXISTS "auth_insert_device_groups" ON device_groups;
CREATE POLICY "anon_insert_device_groups" ON device_groups FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_device_groups" ON device_groups;
CREATE POLICY "anon_update_device_groups" ON device_groups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_device_groups" ON device_groups;
CREATE POLICY "anon_delete_device_groups" ON device_groups FOR DELETE TO anon, authenticated USING (true);

-- device_group_members
DROP POLICY IF EXISTS "auth_insert_dgm" ON device_group_members;
CREATE POLICY "anon_insert_dgm" ON device_group_members FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_dgm" ON device_group_members;
CREATE POLICY "anon_update_dgm" ON device_group_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_dgm" ON device_group_members;
CREATE POLICY "anon_delete_dgm" ON device_group_members FOR DELETE TO anon, authenticated USING (true);

-- device_group_brands
DROP POLICY IF EXISTS "auth_insert_dgb" ON device_group_brands;
CREATE POLICY "anon_insert_dgb" ON device_group_brands FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_dgb" ON device_group_brands;
CREATE POLICY "anon_update_dgb" ON device_group_brands FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_dgb" ON device_group_brands;
CREATE POLICY "anon_delete_dgb" ON device_group_brands FOR DELETE TO anon, authenticated USING (true);
