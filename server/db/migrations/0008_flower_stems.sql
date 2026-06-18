-- Replace the categorical `availability` (good/limited/…) with a numeric stem
-- count. Semantics of `stemsAvailable`:
--   NULL  → available, count unspecified ("Available")
--   0     → sold out
--   > 0   → that many stems currently available
ALTER TABLE flower ADD COLUMN stemsAvailable INTEGER;

-- Back-fill existing rows from the old categorical values (approximate counts).
UPDATE flower SET stemsAvailable = CASE availability
  WHEN 'sold_out'     THEN 0
  WHEN 'very_limited' THEN 10
  WHEN 'limited'      THEN 30
  WHEN 'midweek'      THEN 20
  ELSE NULL -- 'good' → available, unspecified
END;

-- Drop the now-unused categorical column (SQLite/D1 support DROP COLUMN).
ALTER TABLE flower DROP COLUMN availability;
