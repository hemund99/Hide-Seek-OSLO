CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`game` text NOT NULL,
	`user` text NOT NULL,
	`team` text NOT NULL,
	`location` text,
	`updated` integer DEFAULT 0 NOT NULL
);
