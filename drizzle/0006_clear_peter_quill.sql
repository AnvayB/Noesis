CREATE TABLE `explain_back_relations` (
	`explain_back_id` text NOT NULL,
	`relation_id` text NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`explain_back_id`) REFERENCES `explain_backs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`relation_id`) REFERENCES `concept_relations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `weekly_focus` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`week_start` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
