/*
# Items on labels follow a source daypart
1. Changes
   - `device_schedule_items.follows_daypart` (text, nullable): the source daypart whose days the
     item follows on that label page (Auto), when it isn't the page's own. A Brunch item added
     to the Breakfast page follows Brunch's days. Null = the page's daypart (every existing row).
   Copy, paste and recurring weeks carry it with the items.
2. Security
   - No change: the table's existing RLS policies cover the new column.
*/

ALTER TABLE device_schedule_items ADD COLUMN IF NOT EXISTS follows_daypart text;
