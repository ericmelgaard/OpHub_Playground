/*
  # Change menu_items primary key to composite (id, date)

  1. Changes
    - Drop existing primary key constraint on `id` alone
    - Add new composite primary key on `(id, date)`
    - This allows the same menu item ID to appear on different dates
  
  2. Rationale
    - The external API reuses item IDs across different dates
    - Same item on different days needs to be stored separately
    - Composite key ensures uniqueness per day
*/

DO $$
BEGIN
  -- Drop the existing primary key constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'menu_items' 
    AND constraint_name = 'menu_items_pkey'
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE menu_items DROP CONSTRAINT menu_items_pkey;
  END IF;

  -- Add new composite primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'menu_items' 
    AND constraint_name = 'menu_items_pkey'
  ) THEN
    ALTER TABLE menu_items ADD PRIMARY KEY (id, date);
  END IF;
END $$;