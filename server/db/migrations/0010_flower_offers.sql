-- "Open to offers" flag on a flower's price. When set, buyers see that the
-- grower will consider offers rather than only the listed price.
--   0 → fixed price (default)
--   1 → open to offers
ALTER TABLE flower ADD COLUMN openToOffers INTEGER NOT NULL DEFAULT 0;
