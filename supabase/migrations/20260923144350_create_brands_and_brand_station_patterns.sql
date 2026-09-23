/*
# Create Brands and Brand Station Patterns

1. New Tables
  - `brands`
    - `id` (serial, primary key) - auto-incrementing brand ID
    - `key` (text, unique) - URL-safe slug, e.g. "bibimbap", "bigcitybbq"
    - `display_name` (text) - Human-readable brand name, e.g. "Bibimbap", "Big City BBQ"
    - `logo_filename` (text, nullable) - Filename for the brand logo (e.g. "bibimbap.png")
    - `logo_base_url` (text) - Base URL for logo assets
    - `created_at` (timestamptz)

  - `brand_station_patterns`
    - `id` (uuid, primary key)
    - `brand_id` (integer, FK to brands) - Which brand this pattern belongs to
    - `station_pattern` (text) - The station name to match (lowercased), e.g. "bibimbap - daily features"
    - `sort_order` (integer) - Display ordering within the brand
    - `created_at` (timestamptz)
    - Unique constraint on (brand_id, station_pattern) to prevent duplicates

2. Cleanup
  - Drop orphaned `brand_stations` table from an interrupted previous migration

3. Security
  - Enable RLS on both tables
  - Allow anon + authenticated SELECT (menu/brand data is public)
  - Allow authenticated INSERT, UPDATE, DELETE

4. Seed Data
  - All ~60 Eurest brand definitions with their station patterns
*/

-- Drop orphaned table from interrupted previous migration
DROP TABLE IF EXISTS brand_stations;

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id serial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  logo_filename text,
  logo_base_url text NOT NULL DEFAULT 'https://client.wanddigital.com/cms_mediafiles/DIGITAL_ASSETS_NX01/',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_brands" ON brands;
CREATE POLICY "anon_select_brands" ON brands FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_brands" ON brands;
CREATE POLICY "auth_insert_brands" ON brands FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_brands" ON brands;
CREATE POLICY "auth_update_brands" ON brands FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_brands" ON brands;
CREATE POLICY "auth_delete_brands" ON brands FOR DELETE TO authenticated USING (true);

-- Create brand_station_patterns table
CREATE TABLE IF NOT EXISTS brand_station_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id integer NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  station_pattern text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, station_pattern)
);

CREATE INDEX IF NOT EXISTS idx_brand_station_patterns_brand ON brand_station_patterns(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_station_patterns_pattern ON brand_station_patterns(station_pattern);

ALTER TABLE brand_station_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_brand_station_patterns" ON brand_station_patterns;
CREATE POLICY "anon_select_brand_station_patterns" ON brand_station_patterns FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_brand_station_patterns" ON brand_station_patterns;
CREATE POLICY "auth_insert_brand_station_patterns" ON brand_station_patterns FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_brand_station_patterns" ON brand_station_patterns;
CREATE POLICY "auth_update_brand_station_patterns" ON brand_station_patterns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_brand_station_patterns" ON brand_station_patterns;
CREATE POLICY "auth_delete_brand_station_patterns" ON brand_station_patterns FOR DELETE TO authenticated USING (true);

-- Seed all Eurest brand definitions
INSERT INTO brands (key, display_name, logo_filename) VALUES
  ('bibimbap', 'Bibimbap', 'bibimbap.png'),
  ('bigcitybbq', 'Big City BBQ', 'bigcitybbq.png'),
  ('bokchoy', 'Bok Choy', 'bokchoy.png'),
  ('breakfastbakery', 'Breakfast Bakery', 'breakfastbakery.png'),
  ('breakfastbyopowerbowl', 'Breakfast BYO Power Bowl', 'breakfastbyopowerbowl.png'),
  ('breakfastbyotoastbar', 'Breakfast BYO Toast Bar', 'breakfastbyotoastbar.png'),
  ('breakfastcharcuterie', 'Breakfast Charcuterie', 'breakfastcharcuterie.png'),
  ('breakfastdeli', 'Breakfast Deli', 'breakfastdeli.png'),
  ('breakfastgrabandgo', 'Breakfast Grab & Go', 'breakfastgrabandgo.png'),
  ('breakfastgrill', 'Breakfast Grill', 'breakfastgrill.png'),
  ('breakfasthotcereal', 'Breakfast Hot Cereal', 'breakfasthotcereal.png'),
  ('breakfasthotcoldcerealbar', 'Breakfast Hot & Cold Cereal Bar', 'breakfasthotcoldcerealbar.png'),
  ('breakfasthotgraze', 'Breakfast Hot Graze', 'breakfasthotgraze.png'),
  ('breakfastpizza', 'Breakfast Pizza', 'breakfastpizza.png'),
  ('butcherbaker', 'Butcher & Baker', 'butcherbaker.png'),
  ('chefstable', 'Chef''s Table', 'chefstable.png'),
  ('coolchicks', 'Cool Chicks', 'coolchicks.png'),
  ('crave', 'Crave', 'crave.png'),
  ('create', 'Create', 'create.png'),
  ('crisp', 'Crisp', 'crisp.png'),
  ('dhabanorth', 'Dhaba North', 'dhabanorth.png'),
  ('dhabasouth', 'Dhaba South', 'dhabasouth.png'),
  ('dhabatikka', 'Dhaba Tikka', 'dhabatikka.png'),
  ('earthbowl', 'Earth Bowl', 'earthbowl.png'),
  ('elmollete', 'El Mollete', 'elmollete.png'),
  ('fishandchipshop', 'Fish & Chip Shop', 'fishandchipshop.png'),
  ('fishmarket', 'Fish Market', 'fishmarket.png'),
  ('flame', 'Flame', 'flame.png'),
  ('flychix', 'Fly Chix', 'flychix.png'),
  ('gingerrepublic', 'Ginger Republic', 'gingerrepublic.png'),
  ('goodmoodmonday', 'Good Mood Monday', 'goodmoodmonday.png'),
  ('graze', 'Graze', 'graze.png'),
  ('grillsandgreens', 'Grills & Greens', 'grillsandgreens.png'),
  ('ifpigshadwings', 'If Pigs Had Wings', 'ifpigshadwings.png'),
  ('islandeats', 'Island Eats', 'islandeats.png'),
  ('justburgers', 'Just Burgers', 'justburgers.png'),
  ('kitchenco', 'Kitchen & Co.', 'kitchenco.png'),
  ('leafladle', 'Leaf & Ladle', 'leafladle.png'),
  ('littlelime', 'Little Lime', 'littlelime.png'),
  ('maccheeseology', 'Mac & Cheesyology', 'maccheeseology.png'),
  ('machuperu', 'Machu Peru', 'machuperu.png'),
  ('madetomelt', 'Made to Melt', 'madetomelt.png'),
  ('madspice', 'Mad Spice', 'madspice.png'),
  ('marketfresh', 'Market Fresh', 'marketfresh.png'),
  ('masala', 'Masala', 'masala.png'),
  ('meatballinc', 'Meatball, Inc', 'meatballinc.png'),
  ('mezze', 'Mezze', 'mezze.png'),
  ('mix', 'Mix', 'mix.png'),
  ('piccolaitalia', 'Piccola Italia', 'piccolaitalia.png'),
  ('picomesa', 'Pico Mesa', 'picomesa.png'),
  ('piripiri', 'Piri Piri', 'piripiri.png'),
  ('pulpculture', 'Pulp Culture', 'pulpculture.png'),
  ('revolutionnoodle', 'Revolution Noodle', 'revolutionnoodle.png'),
  ('rhythmandroux', 'Rhythm & Roux', 'rhythmandroux.png'),
  ('roost1996', 'Roost 1996', 'roost1996.png'),
  ('rootsandseeds', 'Roots & Seeds', 'rootsandseeds.png'),
  ('soulkitchen', 'Soul Kitchen', 'soulkitchen.png'),
  ('soup', 'Soup', 'soup.png'),
  ('streeteats', 'Street Eats', 'streeteats.png'),
  ('tacocantina', 'Taco Cantina', 'tacocantina.png'),
  ('tagine', 'Tagine', 'tagine.png'),
  ('thaiandtrue', 'Thai & True', 'thaiandtrue.png'),
  ('turoturo', 'Turo Turo', 'turoturo.png'),
  ('craftmarket', 'Craft Market', 'craftmarket.png'),
  ('desserts', 'Desserts', 'desserts.png'),
  ('breakfastomelet', 'Breakfast Omelet', 'breakfastomelet.png'),
  ('pulpculturebowl', 'Pulp Culture Bowl', 'pulpculture.png')
ON CONFLICT (key) DO NOTHING;
