-- Run explicitly with scripts/migrate-gallery.ts. Never enable Payload db.push.
-- Empty tables are intentional: the checked-in catalog remains the static source
-- of truth, while these tables contain uploads and reversible catalog overrides.
CREATE TABLE IF NOT EXISTS BlogGalleryMeta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
INSERT INTO BlogGalleryMeta (id, schema_version, revision)
VALUES (1, 1, 0) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS BlogGalleryAlbum (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  name_key TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS BlogGalleryAlbumActiveName
  ON BlogGalleryAlbum (name_key) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS BlogGalleryImage (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('static', 'upload')),
  category_id TEXT NOT NULL REFERENCES BlogGalleryAlbum (id),
  media_id INTEGER UNIQUE,
  src TEXT,
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 20000),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 20000),
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((kind = 'static' AND media_id IS NULL) OR
    (kind = 'upload' AND media_id > 0 AND src IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS BlogGalleryImageAlbum
  ON BlogGalleryImage (category_id, deleted_at);
