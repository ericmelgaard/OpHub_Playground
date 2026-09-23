/*
# Create condensed menu items view

## Purpose
Pre-groups menu_items rows by MRN + name (so items with the same MRN but different 
portion sizes in the name remain separate). Aggregates meal periods, stations, and 
dates into arrays so the frontend receives one row per unique product instead of 
one row per product-per-date-per-station.

## New Views
- `menu_items_condensed` (SECURITY INVOKER, so RLS on menu_items is respected)
  - `id` (integer) - the first-seen row id for this product
  - `mrn` (text) - master recipe number
  - `name` (text) - product name (includes portion when it differs)
  - `description`, `enticing_description`, `ingredients` (text)
  - `price`, `calories` (text)
  - `allergens` (text), `nutrition` (jsonb), `icons` (jsonb)
  - `sort_order` (integer)
  - `meal_period_ids` (integer[]) - all distinct meal period IDs
  - `station_ids` (integer[]) - all distinct station IDs
  - `dates` (date[]) - all dates this item appears on
  - `occurrence_count` (bigint) - how many raw rows were condensed
  - `created_at`, `updated_at` (timestamptz)

## Security
- View uses SECURITY INVOKER (default) so the caller's RLS policies on
  menu_items still apply. No separate RLS needed on the view.
*/

CREATE OR REPLACE VIEW menu_items_condensed AS
SELECT
  MIN(mi.id) AS id,
  mi.mrn,
  mi.name,
  MIN(mi.description) AS description,
  MIN(mi.enticing_description) AS enticing_description,
  MIN(mi.ingredients) AS ingredients,
  MIN(mi.price) AS price,
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
GROUP BY mi.mrn, mi.name;
