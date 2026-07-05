-- Point all self-hosted media (images + downloads) at relative /uploads/ paths,
-- which functions/uploads/[[path]].ts serves from your R2 bucket.
-- Rewrites any of the old hosts (testbankbooks.com, testbankbooks.replit.app,
-- nurstestbank.com) to a bare /uploads/ path. External hosts (Google Drive,
-- studiazone, etc.) are left untouched. Idempotent — safe to re-run.
--
-- Apply: npx wrangler d1 execute testbankbooks --remote --file=migrations/0003_normalize_media_urls.sql

-- image_url
UPDATE products SET image_url = REPLACE(image_url, 'https://testbankbooks.com/uploads/', '/uploads/')        WHERE image_url LIKE '%//testbankbooks.com/uploads/%';
UPDATE products SET image_url = REPLACE(image_url, 'https://testbankbooks.replit.app/uploads/', '/uploads/')  WHERE image_url LIKE '%//testbankbooks.replit.app/uploads/%';
UPDATE products SET image_url = REPLACE(image_url, 'https://nurstestbank.com/uploads/', '/uploads/')          WHERE image_url LIKE '%//nurstestbank.com/uploads/%';

-- download_path
UPDATE products SET download_path = REPLACE(download_path, 'https://testbankbooks.com/uploads/', '/uploads/')       WHERE download_path LIKE '%//testbankbooks.com/uploads/%';
UPDATE products SET download_path = REPLACE(download_path, 'https://testbankbooks.replit.app/uploads/', '/uploads/') WHERE download_path LIKE '%//testbankbooks.replit.app/uploads/%';
UPDATE products SET download_path = REPLACE(download_path, 'https://nurstestbank.com/uploads/', '/uploads/')         WHERE download_path LIKE '%//nurstestbank.com/uploads/%';

-- additional_images (JSON array stored as text — REPLACE swaps every URL inside)
UPDATE products SET additional_images = REPLACE(additional_images, 'https://testbankbooks.com/uploads/', '/uploads/')       WHERE additional_images LIKE '%//testbankbooks.com/uploads/%';
UPDATE products SET additional_images = REPLACE(additional_images, 'https://testbankbooks.replit.app/uploads/', '/uploads/') WHERE additional_images LIKE '%//testbankbooks.replit.app/uploads/%';
UPDATE products SET additional_images = REPLACE(additional_images, 'https://nurstestbank.com/uploads/', '/uploads/')         WHERE additional_images LIKE '%//nurstestbank.com/uploads/%';
