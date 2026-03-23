/*
  # Add Product Availability Tracking

  ## Overview
  This migration creates a system to track which days of the week and meal periods 
  each product (identified by MRN) is historically available. This enables the system
  to accumulate availability data over time as new menu data is fetched.

  ## New Tables
    - `product_availability`
      - `id` (uuid, primary key)
      - `mrn` (text) - Military Recipe Number identifying the product
      - `product_name` (text) - Name of the product for reference
      - `day_of_week` (integer) - 0=Sunday, 1=Monday, ... 6=Saturday
      - `meal_period_id` (integer) - Reference to meal_periods table
      - `station_id` (integer, nullable) - Reference to stations table
      - `first_seen_date` (date) - First date this combination was observed
      - `last_seen_date` (date) - Most recent date this combination was observed
      - `occurrence_count` (integer) - Number of times this combination has appeared
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ## Indexes
    - Composite index on (mrn, day_of_week, meal_period_id) for fast lookups
    - Index on mrn for product queries
    - Index on day_of_week for filtering

  ## Functions
    - `update_product_availability()` - Trigger function to automatically update 
      availability data when menu_items are inserted or updated

  ## Security
    - Enable RLS on product_availability table
    - Add policies for public read access
    - Add policies for authenticated insert/update

  ## Initial Data Population
    - Analyze existing menu_items data
    - Populate product_availability with historical patterns
*/

-- Create product_availability table
CREATE TABLE IF NOT EXISTS product_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text NOT NULL,
  product_name text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_period_id integer REFERENCES meal_periods(id),
  station_id integer REFERENCES stations(id),
  first_seen_date date NOT NULL,
  last_seen_date date NOT NULL,
  occurrence_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mrn, day_of_week, meal_period_id, station_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_product_availability_mrn ON product_availability(mrn);
CREATE INDEX IF NOT EXISTS idx_product_availability_dow ON product_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_product_availability_composite ON product_availability(mrn, day_of_week, meal_period_id);

-- Enable RLS
ALTER TABLE product_availability ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view product availability"
  ON product_availability
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert product availability"
  ON product_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product availability"
  ON product_availability
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update product availability when menu items are added
CREATE OR REPLACE FUNCTION update_product_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if MRN exists
  IF NEW.mrn IS NOT NULL AND NEW.mrn != '' THEN
    INSERT INTO product_availability (
      mrn,
      product_name,
      day_of_week,
      meal_period_id,
      station_id,
      first_seen_date,
      last_seen_date,
      occurrence_count
    )
    VALUES (
      NEW.mrn,
      NEW.name,
      EXTRACT(DOW FROM NEW.date)::integer,
      NEW.meal_period_id,
      NEW.station_id,
      NEW.date,
      NEW.date,
      1
    )
    ON CONFLICT (mrn, day_of_week, meal_period_id, station_id)
    DO UPDATE SET
      product_name = EXCLUDED.product_name,
      last_seen_date = GREATEST(product_availability.last_seen_date, EXCLUDED.last_seen_date),
      first_seen_date = LEAST(product_availability.first_seen_date, EXCLUDED.first_seen_date),
      occurrence_count = product_availability.occurrence_count + 1,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on menu_items
DROP TRIGGER IF EXISTS trigger_update_product_availability ON menu_items;
CREATE TRIGGER trigger_update_product_availability
  AFTER INSERT OR UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_availability();

-- Populate initial data from existing menu_items
INSERT INTO product_availability (
  mrn,
  product_name,
  day_of_week,
  meal_period_id,
  station_id,
  first_seen_date,
  last_seen_date,
  occurrence_count
)
SELECT 
  mrn,
  name as product_name,
  EXTRACT(DOW FROM date)::integer as day_of_week,
  meal_period_id,
  station_id,
  MIN(date) as first_seen_date,
  MAX(date) as last_seen_date,
  COUNT(*) as occurrence_count
FROM menu_items
WHERE mrn IS NOT NULL AND mrn != ''
GROUP BY mrn, name, EXTRACT(DOW FROM date)::integer, meal_period_id, station_id
ON CONFLICT (mrn, day_of_week, meal_period_id, station_id) DO NOTHING;
