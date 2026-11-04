/*
# Edit custom products and set their days
1. Security Changes
   - Add an UPDATE policy on menu_items for anon, limited to custom rows
     (source_name = 'converge-custom'), so the app can edit products it created.
     Synced Webtrition rows still change only through the edge function.
2. Function Changes
   - update_product_availability() skips custom products. It stamped each new
     custom product with the weekday it was created (and again on every edit),
     so a product made on a Wednesday showed only on Wednesdays.
   - New set_custom_product_days(p_mrn, p_days) replaces a custom product's
     weekdays in product_availability. SECURITY DEFINER because anon has no
     direct write access to product_availability; it only touches custom MRNs.
*/

DROP POLICY IF EXISTS "anon_update_custom_menu_items" ON menu_items;
CREATE POLICY "anon_update_custom_menu_items"
ON menu_items FOR UPDATE
TO anon, authenticated
USING (source_name = 'converge-custom')
WITH CHECK (source_name = 'converge-custom');

CREATE OR REPLACE FUNCTION update_product_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Custom products get their days from set_custom_product_days()
  IF NEW.source_name = 'converge-custom' THEN
    RETURN NEW;
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_custom_product_days(p_mrn text, p_days integer[])
RETURNS void AS $$
DECLARE
  product menu_items%ROWTYPE;
BEGIN
  SELECT * INTO product FROM menu_items
  WHERE mrn = p_mrn AND source_name = 'converge-custom'
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a custom product: %', p_mrn;
  END IF;

  DELETE FROM product_availability WHERE mrn = p_mrn;

  INSERT INTO product_availability (
    mrn, product_name, day_of_week, meal_period_id, station_id,
    first_seen_date, last_seen_date, occurrence_count
  )
  SELECT DISTINCT p_mrn, product.name, d, product.meal_period_id, product.station_id,
    current_date, current_date, 1
  FROM unnest(p_days) AS d
  WHERE d BETWEEN 0 AND 6;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION set_custom_product_days(text, integer[]) TO anon, authenticated;
