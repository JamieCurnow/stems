CREATE TABLE IF NOT EXISTS profile (
  userId       TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  handle       TEXT NOT NULL UNIQUE,
  farmName     TEXT NOT NULL,
  bio          TEXT,
  locationName TEXT,
  postcode     TEXT,
  latitude     REAL,
  longitude    REAL,
  instagram    TEXT,
  website      TEXT,
  avatarKey    TEXT,
  bannerKey    TEXT,
  isGrower     INTEGER NOT NULL DEFAULT 0,
  createdAt    INTEGER NOT NULL,
  updatedAt    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS profile_handle_idx ON profile(handle);
CREATE INDEX IF NOT EXISTS profile_isGrower_idx ON profile(isGrower);
