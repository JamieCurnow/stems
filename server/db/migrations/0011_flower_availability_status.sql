-- Categorical availability hint, set independently of the numeric `stemsAvailable`
-- count. NULL = no status chosen. Allowed values (enforced in app code, see
-- shared/utils/flowers.ts): good | limited | very_limited | sold_out | midweek |
-- next_week | soon.
ALTER TABLE flower ADD COLUMN availabilityStatus TEXT;
