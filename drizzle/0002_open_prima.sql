CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`game` text NOT NULL,
	`user` text NOT NULL,
	`subscription` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_push_game` ON `push_subscriptions` (`game`);