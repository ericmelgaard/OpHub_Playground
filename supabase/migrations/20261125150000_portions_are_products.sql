/*
# Each portion is its own product (menu platform spec v2.6, D64)

Replaces the "portion is a choice" step from 20261125130000_recipe_variants.sql. A source product is
MRN + portion: cup and bowl are two products. Station + daypart is still the variant, and the only
choice when adding to a label. Sizes of one MRN are linked for display only (family).

1. Changes
   - `menu_items_condensed`: one row per MRN + portion (it was one per MRN). New columns at the end:
     - `source_mrn` (text): the MRN as the source sends it
     - `portion` (text): the portion, '' when none
     - `family_size` (bigint): how many portions the MRN comes in (sizes of one family)
     `mrn` is the product's key: the MRN when it comes in one portion, else `MRN|portion`, so every
     table keyed by product (display names, local values, label items) tells the sizes apart.
   - `menu_item_variants` is rebuilt: one row per product (`product_key`, same key as above) +
     station + meal period, with its latest name and price there and the dates it's served.
2. Demo data
   - Grilled chicken breast: the flame - core options rows are the same 4 oz portion, so it stays one
     product served at two Lunch stations (pick the station).
   - Fried tater tots: no portion, so it stays one product at Lunch and two Breakfast stations.
   - Smoked beef brisket 1/2 lb and 1 lb, and buttermilk pancakes short stack and full stack, are now
     two products each. The full stack is served at two Breakfast stations (pick the station).
3. Security
   - No change: the views use the caller's access to menu_items (SECURITY INVOKER).
*/

-- Demo data first, so the views below see the final portions
UPDATE menu_items SET portion = '4 oz' WHERE mrn = '18020.3';
UPDATE menu_items SET portion = NULL WHERE mrn = '181001.0';

-- One product per MRN + portion
CREATE OR REPLACE VIEW menu_items_condensed AS
WITH family AS (
  SELECT mrn, COUNT(DISTINCT COALESCE(portion, '')) AS sizes
  FROM menu_items
  GROUP BY mrn
)
SELECT
  MIN(mi.id) AS id,
  CASE WHEN COALESCE(f.sizes, 1) > 1 THEN mi.mrn || '|' || COALESCE(mi.portion, '') ELSE mi.mrn END AS mrn,
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
  MAX(mi.updated_at) AS updated_at,
  mi.mrn AS source_mrn,
  COALESCE(mi.portion, '') AS portion,
  COALESCE(f.sizes, 1) AS family_size
FROM menu_items mi
LEFT JOIN family f ON f.mrn = mi.mrn
GROUP BY mi.mrn, COALESCE(mi.portion, ''), f.sizes;

-- Each product's variants (station + meal period)
DROP VIEW IF EXISTS menu_item_variants;
CREATE VIEW menu_item_variants AS
WITH family AS (
  SELECT mrn, COUNT(DISTINCT COALESCE(portion, '')) AS sizes
  FROM menu_items
  GROUP BY mrn
)
SELECT
  CASE WHEN COALESCE(f.sizes, 1) > 1 THEN mi.mrn || '|' || COALESCE(mi.portion, '') ELSE mi.mrn END AS product_key,
  mi.station_id,
  mi.meal_period_id,
  (array_agg(mi.name ORDER BY mi.date DESC, mi.id))[1] AS name,
  (array_agg(mi.price ORDER BY mi.date DESC, mi.id))[1] AS price,
  array_agg(DISTINCT mi.date ORDER BY mi.date) AS dates
FROM menu_items mi
LEFT JOIN family f ON f.mrn = mi.mrn
WHERE mi.station_id IS NOT NULL AND mi.meal_period_id IS NOT NULL
GROUP BY mi.mrn, COALESCE(mi.portion, ''), f.sizes, mi.station_id, mi.meal_period_id;

GRANT SELECT ON menu_item_variants TO anon, authenticated;
