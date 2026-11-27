/*
# Label items are per day (menu platform spec v2.7, §4.8, D66)

A label item (spec: scheduled item) is one product on one label daypart page on ONE day.
`device_schedule_items` already has one row per day; from now on those rows ARE the days:
- a row = the item is on the label that day
- `state` says how: 'auto' follows the source's days, 'on' shows anyway, 'hidden' is for Auto Fill
- no row = not on the label that day (this replaces the 'off' rows in label_day_settings)

Adding on Tuesday stores Tuesday's row only. Adding in Every day stores seven (all 'auto').

1. Changes
   - `device_schedule_items.state` (text, 'auto' | 'on' | 'hidden', default 'auto')
   - Unique: one row per schedule, daypart, item and day
   - `label_day_settings` is folded into the rows, then renamed `label_day_settings_retired`
     (kept for now as a backup; drop it once the per-day rows look right)

2. Conversion, per item on a page (schedule + daypart + MRN), for each of the 7 days:
   - Linked items: an 'off' setting = no row; an 'on' setting = a row with state 'on';
     no setting = a row with state 'auto' (all 7 days, so it shows whenever the source serves it)
   - Custom items (CUSTOM- MRNs) have no source days: only their 'on' days get a row ('on')
   Name, price, order, followed daypart and variant are copied from the item's existing row.

Runs once: if `label_day_settings` is already gone (renamed), it only makes sure the column
and index exist.

Needs: 20261115140000_schedule_item_follows_daypart.sql and 20261125130000_recipe_variants.sql
(the follows_daypart and variant columns).
*/

ALTER TABLE device_schedule_items
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'auto';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_schedule_items_state_check') THEN
    ALTER TABLE device_schedule_items
      ADD CONSTRAINT device_schedule_items_state_check CHECK (state IN ('auto', 'on', 'hidden'));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.label_day_settings') IS NULL THEN
    RAISE NOTICE 'label_day_settings is gone: already converted, nothing to fold in';
    RETURN;
  END IF;

  -- One template row per item on a page (its earliest row)
  CREATE TEMP TABLE dsi_items ON COMMIT DROP AS
  SELECT DISTINCT ON (schedule_id, daypart, menu_item_mrn)
    schedule_id, daypart, menu_item_mrn, menu_item_name, menu_item_price, sort_order,
    follows_daypart, variant, created_at
  FROM device_schedule_items
  ORDER BY schedule_id, daypart, menu_item_mrn, created_at, id;

  -- Its days under the new rule
  CREATE TEMP TABLE dsi_days ON COMMIT DROP AS
  SELECT i.*, d.day AS day_of_week,
         CASE WHEN s.state = 'on' THEN 'on' ELSE 'auto' END AS state
  FROM dsi_items i
  CROSS JOIN generate_series(0, 6) AS d(day)
  LEFT JOIN label_day_settings s
    ON s.schedule_id = i.schedule_id
   AND s.daypart = i.daypart
   AND s.menu_item_mrn = i.menu_item_mrn
   AND s.day_of_week = d.day
  WHERE CASE
    WHEN i.menu_item_mrn LIKE 'CUSTOM-%' THEN s.state = 'on'
    ELSE coalesce(s.state, 'auto') <> 'off'
  END;

  DELETE FROM device_schedule_items;

  INSERT INTO device_schedule_items
    (schedule_id, daypart, day_of_week, menu_item_mrn, menu_item_name, menu_item_price,
     sort_order, follows_daypart, variant, state, created_at)
  SELECT schedule_id, daypart, day_of_week, menu_item_mrn, menu_item_name, menu_item_price,
         sort_order, follows_daypart, variant, state, created_at
  FROM dsi_days;

  ALTER TABLE label_day_settings RENAME TO label_day_settings_retired;
END $$;

-- One row per item per day on a page
CREATE UNIQUE INDEX IF NOT EXISTS device_schedule_items_one_per_day
  ON device_schedule_items (schedule_id, daypart, menu_item_mrn, day_of_week);
