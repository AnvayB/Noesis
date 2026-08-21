ALTER TABLE `concept_relations` ADD `strength` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `concepts` ADD `layout_x` real;--> statement-breakpoint
ALTER TABLE `concepts` ADD `layout_y` real;