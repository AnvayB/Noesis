CREATE TABLE `curriculum_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`module_slug` text NOT NULL,
	`level` text NOT NULL,
	`user_response` text,
	`verdict` text,
	`what_you_got_right` text DEFAULT '[]' NOT NULL,
	`misconceptions` text DEFAULT '[]' NOT NULL,
	`gaps` text DEFAULT '[]' NOT NULL,
	`follow_up_question` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
