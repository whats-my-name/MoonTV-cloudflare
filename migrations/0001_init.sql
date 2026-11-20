-- cf-D1 初始表结构
-- 在 Cloudflare D1 中执行：npm run db:init

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS play_records (
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  cover TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  index_episode INTEGER NOT NULL DEFAULT 0,
  total_episodes INTEGER NOT NULL DEFAULT 0,
  play_time REAL NOT NULL DEFAULT 0,
  total_time REAL NOT NULL DEFAULT 0,
  save_time INTEGER NOT NULL,
  search_title TEXT,
  PRIMARY KEY (username, key)
);

CREATE TABLE IF NOT EXISTS favorites (
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  cover TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  total_episodes INTEGER NOT NULL DEFAULT 0,
  save_time INTEGER NOT NULL,
  search_title TEXT,
  PRIMARY KEY (username, key)
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  keyword TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skip_configs (
  username TEXT NOT NULL,
  source TEXT NOT NULL,
  id_video TEXT NOT NULL,
  enable INTEGER NOT NULL DEFAULT 0,
  intro_time REAL NOT NULL DEFAULT 0,
  outro_time REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (username, source, id_video)
);

CREATE INDEX IF NOT EXISTS idx_play_records_username_save
  ON play_records (username, save_time DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_username_save
  ON favorites (username, save_time DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_username_created
  ON search_history (username, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skip_configs_username
  ON skip_configs (username);

CREATE INDEX IF NOT EXISTS idx_users_created
  ON users (created_at);
