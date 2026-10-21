-- ShowingBook database schema (SQLite). Creates the whole database from an empty file.
-- Apply with:  npm run db:init   (from Project/)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin','agent')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  stage      TEXT NOT NULL DEFAULT 'Lead' CHECK (stage IN ('Lead','Searching','Viewing','Offer','Closed')),
  budget     TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  social_fb  TEXT NOT NULL DEFAULT '',
  social_ig  TEXT NOT NULL DEFAULT '',
  social_li  TEXT NOT NULL DEFAULT '',
  social_ot  TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_id, stage);

CREATE TABLE IF NOT EXISTS client_tags (
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY (client_id, tag)
);

CREATE TABLE IF NOT EXISTS listings (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address    TEXT NOT NULL,
  price      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Coming soon','Active','Under offer','Sold')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id, status);

CREATE TABLE IF NOT EXISTS viewings (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id  TEXT REFERENCES clients(id) ON DELETE SET NULL,
  property   TEXT NOT NULL,
  view_date  TEXT NOT NULL CHECK (view_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  view_time  TEXT NOT NULL CHECK (view_time GLOB '[0-9][0-9]:[0-9][0-9]'),
  dur_min    INTEGER NOT NULL DEFAULT 60 CHECK (dur_min BETWEEN 15 AND 240),
  status     TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','cancelled')),
  notes      TEXT NOT NULL DEFAULT '',
  confirmed  INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0,1)),
  reminded   INTEGER NOT NULL DEFAULT 0 CHECK (reminded IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_viewings_owner_date ON viewings(owner_id, view_date);
CREATE INDEX IF NOT EXISTS idx_viewings_client ON viewings(client_id);

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id  TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  due_date   TEXT NOT NULL CHECK (due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_due ON tasks(owner_id, done, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
