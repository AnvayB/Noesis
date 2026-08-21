CREATE TABLE `recall_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`concept_id` text NOT NULL,
	`triggered_by` text NOT NULL,
	`prompt` text NOT NULL,
	`expected_key_points` text DEFAULT '[]' NOT NULL,
	`response` text,
	`outcome` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`answered_at` text,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
