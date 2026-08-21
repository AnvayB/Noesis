CREATE TABLE `concept_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_concept_id` text NOT NULL,
	`to_concept_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`source` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`from_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `concept_understandings` (
	`id` text PRIMARY KEY NOT NULL,
	`explain_back_id` text NOT NULL,
	`depth` text NOT NULL,
	`clarity` text NOT NULL,
	`omissions` text DEFAULT '[]' NOT NULL,
	`misconceptions` text DEFAULT '[]' NOT NULL,
	`connections_made` text DEFAULT '[]' NOT NULL,
	`follow_up_question` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`explain_back_id`) REFERENCES `explain_backs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concept_understandings_explain_back_id_unique` ON `concept_understandings` (`explain_back_id`);--> statement-breakpoint
CREATE TABLE `explain_back_concepts` (
	`explain_back_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`explain_back_id`) REFERENCES `explain_backs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `explain_backs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`input_mode` text NOT NULL,
	`raw_text` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `concepts` ADD `last_reviewed_at` text;