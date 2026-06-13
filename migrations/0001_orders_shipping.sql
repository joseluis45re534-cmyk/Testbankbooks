-- Add physical shipping fields to orders.
-- Apply: npx wrangler d1 execute nurstestbank --remote --file=migrations/0001_orders_shipping.sql
ALTER TABLE orders ADD COLUMN shipping_address1 text;
ALTER TABLE orders ADD COLUMN shipping_address2 text;
ALTER TABLE orders ADD COLUMN shipping_city text;
ALTER TABLE orders ADD COLUMN shipping_state text;
ALTER TABLE orders ADD COLUMN shipping_postal_code text;
ALTER TABLE orders ADD COLUMN tracking_number text;
ALTER TABLE orders ADD COLUMN shipped_at integer;
