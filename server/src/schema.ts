import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const editions = sqliteTable("editions", {
  date: text("date").primaryKey(), // YYYY-MM-DD Asia/Shanghai
  generatedAt: integer("generated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  sourceNote: text("source_note"),
});

export const digests = sqliteTable("digests", {
  date: text("date").primaryKey(), // YYYY-MM-DD Asia/Shanghai
  title: text("title").notNull(),
  content: text("content").notNull(), // Markdown full text
});

export const starEditions = sqliteTable("star_editions", {
  date: text("date").primaryKey(), // YYYY-MM-DD (Sunday edition date, Asia/Shanghai)
  title: text("title").notNull(),
  periodLabel: text("period_label"),
  sourceNote: text("source_note"),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const starItems = sqliteTable("star_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  editionDate: text("edition_date").notNull(),
  rank: integer("rank").notNull(),
  repoName: text("repo_name").notNull(),
  descriptionZh: text("description_zh").notNull(),
  url: text("url").notNull(),
  totalStars: integer("total_stars").notNull().default(0),
  weeklyStars: integer("weekly_stars").notNull().default(0),
  pushedAt: text("pushed_at"), // GitHub API pushed_at (ISO), per-repo last update
});

export const rankingItems = sqliteTable("ranking_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  editionDate: text("edition_date").notNull(),
  board: text("board", { enum: ["hot", "opportunity"] }).notNull(),
  rank: integer("rank").notNull(),
  titleZh: text("title_zh").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  source: text("source"),
  score: integer("score").notNull().default(0),
  category: text("category"),
  publishedAt: text("published_at"),
});
