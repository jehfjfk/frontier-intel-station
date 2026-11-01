DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE editions (
  date TEXT PRIMARY KEY,
  generated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE ranking_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_date TEXT NOT NULL,
  board TEXT NOT NULL,
  rank INTEGER NOT NULL,
  title_zh TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  category TEXT
);
--> statement-breakpoint
CREATE INDEX idx_items_edition_board ON ranking_items (edition_date, board, rank);
