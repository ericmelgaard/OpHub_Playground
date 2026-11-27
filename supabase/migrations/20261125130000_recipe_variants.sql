/*
# Recipes and variants (menu platform spec v2.5, §6, D60–D63)

Note: spec v2.6 makes each portion its own product again; 20261125150000_portions_are_products.sql
replaces the views below and the portion demo data. Run both, in order.

A Webtrition product is the recipe (MRN). Each meal station + meal period (daypart) it's served at is
a variant with its own name, price and portion. Portion is a value, not identity; it's only a choice
when one station + daypart offers the recipe in more than one portion.

1. Changes
   - `menu_items.portion` (text): the menu item's portion as the source sends it ("1/2 lb").
   - `menu_items_condensed` groups by MRN only (it grouped by MRN + name, so a portion written into
     the name became its own product). Name, price and the rest come from the latest row.
   - New view `menu_item_variants`: one row per recipe + station + meal period + portion, with the
     latest name and price there and the dates it's served.
   - `device_schedule_items.variant` (jsonb): the variant a label item stands for
     ({ stationId, mealPeriodId, portion?, choice: user | inferred | review }). Null on older rows
     until someone picks; the app infers it where only one variant fits.
2. Demo data (this week's dates), so each case can be tried:
   - Grilled chicken breast (18020.3): a second Lunch station, flame - core options, with its own
     name and price → adding it on a Lunch page asks for the station.
   - Smoked beef brisket (87538.0): 1/2 lb and 1 lb at the same station and daypart → the portion is
     a forced choice.
   - Buttermilk pancakes (616.12): short stack (2) only at breakfast grill - sides; full stack (3)
     there and at flame breakfast - daily features → choosing the short stack settles the station.
   - Fried tater tots (181001.0): already at Lunch and two Breakfast stations; the breakfast grill
     variant gets its own name (crispy breakfast tots) and each a portion.
   Demo rows use ids from 2100000000 up and can be removed with
   `DELETE FROM menu_items WHERE id >= 2100000000;`
3. Security
   - No change: the views use the caller's access to menu_items (SECURITY INVOKER).
*/

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS portion text;
ALTER TABLE device_schedule_items ADD COLUMN IF NOT EXISTS variant jsonb;

-- One product per recipe
CREATE OR REPLACE VIEW menu_items_condensed AS
SELECT
  MIN(mi.id) AS id,
  mi.mrn,
  (array_agg(mi.name ORDER BY mi.date DESC, mi.id))[1] AS name,
  MIN(mi.description) AS description,
  MIN(mi.enticing_description) AS enticing_description,
  MIN(mi.ingredients) AS ingredients,
  (array_agg(mi.price ORDER BY mi.date DESC, mi.id))[1] AS price,
  MIN(mi.calories) AS calories,
  MIN(mi.allergens) AS allergens,
  (array_agg(mi.nutrition ORDER BY mi.date DESC))[1] AS nutrition,
  (array_agg(mi.icons ORDER BY mi.date DESC))[1] AS icons,
  MIN(mi.sort_order) AS sort_order,
  array_agg(DISTINCT mi.meal_period_id) FILTER (WHERE mi.meal_period_id IS NOT NULL) AS meal_period_ids,
  array_agg(DISTINCT mi.station_id) FILTER (WHERE mi.station_id IS NOT NULL) AS station_ids,
  array_agg(DISTINCT mi.date ORDER BY mi.date) AS dates,
  COUNT(*) AS occurrence_count,
  MIN(mi.created_at) AS created_at,
  MAX(mi.updated_at) AS updated_at
FROM menu_items mi
GROUP BY mi.mrn;

-- A recipe's variants (station + meal period), one row per portion offered there
CREATE OR REPLACE VIEW menu_item_variants AS
SELECT
  mi.mrn,
  mi.station_id,
  mi.meal_period_id,
  COALESCE(mi.portion, '') AS portion,
  (array_agg(mi.name ORDER BY mi.date DESC, mi.id))[1] AS name,
  (array_agg(mi.price ORDER BY mi.date DESC, mi.id))[1] AS price,
  array_agg(DISTINCT mi.date ORDER BY mi.date) AS dates
FROM menu_items mi
WHERE mi.station_id IS NOT NULL AND mi.meal_period_id IS NOT NULL
GROUP BY mi.mrn, mi.station_id, mi.meal_period_id, COALESCE(mi.portion, '');

GRANT SELECT ON menu_item_variants TO anon, authenticated;

-- ---------- Demo data ----------

-- Portions on the existing rows
UPDATE menu_items SET portion = '4 oz' WHERE mrn = '18020.3' AND portion IS NULL;
UPDATE menu_items SET portion = '1/2 lb' WHERE mrn = '87538.0' AND portion IS NULL;
UPDATE menu_items SET portion = 'short stack (2)' WHERE mrn = '616.12' AND portion IS NULL;
UPDATE menu_items SET portion = 'regular' WHERE mrn = '181001.0' AND station_id = 200827173 AND portion IS NULL;
UPDATE menu_items SET portion = 'side', name = 'crispy breakfast tots'
  WHERE mrn = '181001.0' AND station_id = 200827178;
UPDATE menu_items SET portion = 'side' WHERE mrn = '181001.0' AND station_id = 200827401 AND portion IS NULL;

-- Grilled chicken breast at a second Lunch station, with its own name and price
INSERT INTO menu_items (id, string_id, date, name, description, enticing_description, ingredients, price, mrn,
  calories, allergens, nutrition, icons, meal_period_id, station_id, menu_collection_id, menu_name, source_name,
  sort_order, portion)
SELECT 2100000100 + EXTRACT(DAY FROM date)::int, string_id, date, 'flame grilled chicken breast', description,
  enticing_description, ingredients, '10.49', mrn, calories, allergens, nutrition, icons, 200827099, 200827167,
  menu_collection_id, menu_name, source_name, sort_order, '6 oz'
FROM menu_items WHERE mrn = '18020.3' AND station_id = 200827162
ON CONFLICT DO NOTHING;

-- Smoked beef brisket: a second portion at the same station and daypart
INSERT INTO menu_items (id, string_id, date, name, description, enticing_description, ingredients, price, mrn,
  calories, allergens, nutrition, icons, meal_period_id, station_id, menu_collection_id, menu_name, source_name,
  sort_order, portion)
SELECT 2100000200 + EXTRACT(DAY FROM date)::int, string_id, date, name, description, enticing_description,
  ingredients, '19.99', mrn, calories, allergens, nutrition, icons, meal_period_id, station_id,
  menu_collection_id, menu_name, source_name, sort_order, '1 lb'
FROM menu_items WHERE mrn = '87538.0' AND portion = '1/2 lb'
ON CONFLICT DO NOTHING;

-- Buttermilk pancakes: full stack at the same station, and at a second Breakfast station
INSERT INTO menu_items (id, string_id, date, name, description, enticing_description, ingredients, price, mrn,
  calories, allergens, nutrition, icons, meal_period_id, station_id, menu_collection_id, menu_name, source_name,
  sort_order, portion)
SELECT 2100000300 + EXTRACT(DAY FROM date)::int, string_id, date, name, description, enticing_description,
  ingredients, '5.99', mrn, calories, allergens, nutrition, icons, meal_period_id, station_id,
  menu_collection_id, menu_name, source_name, sort_order, 'full stack (3)'
FROM menu_items WHERE mrn = '616.12' AND station_id = 200827178 AND portion = 'short stack (2)'
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (id, string_id, date, name, description, enticing_description, ingredients, price, mrn,
  calories, allergens, nutrition, icons, meal_period_id, station_id, menu_collection_id, menu_name, source_name,
  sort_order, portion)
SELECT 2100000400 + EXTRACT(DAY FROM date)::int, string_id, date, name, description, enticing_description,
  ingredients, '5.99', mrn, calories, allergens, nutrition, icons, 200827331, 200827402,
  menu_collection_id, menu_name, source_name, sort_order, 'full stack (3)'
FROM menu_items WHERE mrn = '616.12' AND station_id = 200827178 AND portion = 'short stack (2)'
ON CONFLICT DO NOTHING;
