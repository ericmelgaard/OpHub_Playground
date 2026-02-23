/*
  # Create Menu System Schema

  1. New Tables
    - `meal_periods`
      - `id` (integer, primary key)
      - `name` (text) - e.g., 'Breakfast', 'Lunch', 'Dinner'
      - `created_at` (timestamptz)
    
    - `stations`
      - `id` (integer, primary key)
      - `name` (text) - e.g., 'Grill', 'Deli', 'Hot Line'
      - `created_at` (timestamptz)
    
    - `menu_items`
      - `id` (integer, primary key)
      - `string_id` (text)
      - `date` (date)
      - `name` (text)
      - `description` (text, nullable)
      - `enticing_description` (text, nullable)
      - `ingredients` (text, nullable)
      - `price` (text, nullable)
      - `mrn` (text, nullable) - Military Recipe Number
      - `calories` (text, nullable)
      - `allergens` (text, nullable)
      - `nutrition` (jsonb) - Full nutrition object
      - `icons` (jsonb) - Dietary tags/icons array
      - `meal_period_id` (integer, foreign key)
      - `station_id` (integer, foreign key)
      - `menu_collection_id` (integer)
      - `menu_name` (text)
      - `source_name` (text)
      - `sort_order` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (this is menu data)
    - Add policies for authenticated insert/update/delete
*/

-- Create meal_periods table
CREATE TABLE IF NOT EXISTS meal_periods (
  id integer PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view meal periods"
  ON meal_periods
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert meal periods"
  ON meal_periods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id integer PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stations"
  ON stations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert stations"
  ON stations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id integer PRIMARY KEY,
  string_id text,
  date date NOT NULL,
  name text NOT NULL,
  description text,
  enticing_description text,
  ingredients text,
  price text,
  mrn text,
  calories text,
  allergens text,
  nutrition jsonb,
  icons jsonb,
  meal_period_id integer REFERENCES meal_periods(id),
  station_id integer REFERENCES stations(id),
  menu_collection_id integer,
  menu_name text,
  source_name text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_menu_items_date ON menu_items(date);
CREATE INDEX IF NOT EXISTS idx_menu_items_meal_period ON menu_items(meal_period_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_station ON menu_items(station_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_name ON menu_items(name);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view menu items"
  ON menu_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert menu items"
  ON menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update menu items"
  ON menu_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete menu items"
  ON menu_items
  FOR DELETE
  TO authenticated
  USING (true);