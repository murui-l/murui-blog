-- Explicit migration only. Builds and ordinary application reads never run DDL.
CREATE TABLE IF NOT EXISTS BlogMusicOrder (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  track_ids TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT
);
INSERT INTO BlogMusicOrder (id, schema_version, revision, track_ids)
VALUES (1, 1, 0, '[]') ON CONFLICT (id) DO NOTHING;
