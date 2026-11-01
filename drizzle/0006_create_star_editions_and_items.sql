CREATE TABLE `star_editions` (
	`date` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`period_label` text,
	`source_note` text,
	`generated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `star_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`edition_date` text NOT NULL,
	`rank` integer NOT NULL,
	`repo_name` text NOT NULL,
	`description_zh` text NOT NULL,
	`url` text NOT NULL,
	`total_stars` integer NOT NULL,
	`weekly_stars` integer NOT NULL,
	`pushed_at` text
);
