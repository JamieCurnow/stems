CREATE TABLE IF NOT EXISTS flower (
  id            TEXT PRIMARY KEY,
  growerId      TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  variety       TEXT,
  color         TEXT,
  stemLengthCm  INTEGER,
  stemsPerBunch INTEGER,
  pricePerStem  INTEGER,
  pricePerBunch INTEGER,
  availability  TEXT NOT NULL DEFAULT 'good',
  notes         TEXT,
  sortOrder     INTEGER NOT NULL DEFAULT 0,
  isArchived    INTEGER NOT NULL DEFAULT 0,
  createdAt     INTEGER NOT NULL,
  updatedAt     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS flower_growerId_idx ON flower(growerId);
CREATE INDEX IF NOT EXISTS flower_grower_archived_idx ON flower(growerId, isArchived);

CREATE TABLE IF NOT EXISTS flower_photo (
  id        TEXT PRIMARY KEY,
  flowerId  TEXT NOT NULL REFERENCES flower(id) ON DELETE CASCADE,
  r2Key     TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS flower_photo_flowerId_idx ON flower_photo(flowerId);
