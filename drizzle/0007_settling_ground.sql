ALTER TABLE `resources` ADD `byline` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `excerpt` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `word_count` integer;--> statement-breakpoint
ALTER TABLE `concepts` ADD `field` text;--> statement-breakpoint
ALTER TABLE `concept_understandings` ADD `gist` text;--> statement-breakpoint
ALTER TABLE `concept_understandings` ADD `level` integer;--> statement-breakpoint
ALTER TABLE `concept_understandings` ADD `next_step` text;
