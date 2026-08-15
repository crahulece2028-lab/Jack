PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  subject     TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  -- Tags are stored as a comma-wrapped string: ",math,exam," for easy search.
  tags        TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);

CREATE TABLE IF NOT EXISTS images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id     INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  storage_key TEXT    NOT NULL,
  mime        TEXT    NOT NULL DEFAULT 'image/jpeg',
  -- Full public URL when the image lives in Vercel Blob (empty for local disk).
  url         TEXT    NOT NULL DEFAULT '',
  -- Original file name for display (files/attachments, not just images).
  name        TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_images_note ON images(note_id);

-- Dashboard subject tabs. Notes keep their subject as free text; tabs are
-- created automatically when a note uses a new subject, and can be
-- renamed, recoloured, or deleted from the dashboard.
CREATE TABLE IF NOT EXISTS subjects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  color      TEXT    NOT NULL DEFAULT '#818cf8',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
