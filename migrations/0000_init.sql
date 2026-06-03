CREATE TABLE `abandoned_carts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`email` text,
	`customer_name` text,
	`phone` text,
	`product_ids` text,
	`product_titles` text,
	`total_amount` text,
	`created_at` integer,
	`recovery_email_sent` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_unique` ON `admin_users` (`username`);--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`meta_title` text,
	`meta_description` text,
	`category` text,
	`product_id` text,
	`image_url` text,
	`published` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE TABLE `blog_schedule_config` (
	`id` text PRIMARY KEY NOT NULL,
	`posts_per_day` integer DEFAULT 7,
	`enabled` integer DEFAULT true,
	`last_run_at` integer,
	`next_run_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`created_at` integer,
	`email` text,
	`customer_name` text,
	`phone` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`visitor_name` text,
	`visitor_email` text,
	`status` text DEFAULT 'active',
	`last_message_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_type` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false,
	`created_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `download_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`download_count` integer DEFAULT 0,
	`max_downloads` integer DEFAULT 5,
	`created_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `download_tokens_token_unique` ON `download_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text,
	`phone` text,
	`country` text,
	`amount` text NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`payment_method` text,
	`product_ids` text,
	`product_titles` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `payment_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`enabled` integer DEFAULT false,
	`config` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_settings_provider_unique` ON `payment_settings` (`provider`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`price` text NOT NULL,
	`sale_price` text,
	`image_url` text,
	`additional_images` text,
	`product_url` text,
	`availability` text DEFAULT 'in_stock',
	`condition` text DEFAULT 'new',
	`brand` text,
	`category` text,
	`slug` text,
	`tags` text,
	`seo_title` text,
	`seo_description` text,
	`download_path` text,
	`woo_product_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE TABLE `seo_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`keyword` text NOT NULL,
	`category` text,
	`status` text DEFAULT 'pending',
	`priority` integer DEFAULT 0,
	`created_at` integer,
	`used_at` integer,
	`blog_post_slug` text
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_settings_key_unique` ON `site_settings` (`key`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);