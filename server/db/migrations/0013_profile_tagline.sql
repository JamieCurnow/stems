-- Short role/tagline shown as the eyebrow above the farm name on the public
-- listing page, e.g. "Florist & Gardener". Optional free text, no in-app
-- meaning beyond display.
ALTER TABLE profile ADD COLUMN tagline TEXT;
