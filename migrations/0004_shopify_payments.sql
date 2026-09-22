-- Shopify Payments support + idempotent order creation.
-- Apply: npx wrangler d1 execute testbankbooks --remote --file=migrations/0004_shopify_payments.sql
-- NOTE: not idempotent (ALTER TABLE ADD COLUMN fails if re-run). Apply once.

-- Provider-side payment reference ("stripe:pi_...", "paypal:<orderID>",
-- "shopify:<orderId>"). The unique index guarantees one order per payment,
-- even when a webhook and a client-side confirm race each other. SQLite
-- unique indexes allow multiple NULLs, so existing orders are unaffected.
ALTER TABLE orders ADD COLUMN payment_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_ref_unique ON orders (payment_ref);

-- A checkout handed off to an external hosted payment page (Shopify). The
-- cart is snapshotted here so the order can be created from the webhook,
-- independent of the customer's browser.
CREATE TABLE IF NOT EXISTS pending_checkouts (
  id              TEXT PRIMARY KEY NOT NULL,
  session_id      TEXT NOT NULL,
  provider        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid | amount_mismatch
  customer_email  TEXT NOT NULL,
  customer_name   TEXT,
  phone           TEXT,
  amount          TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  product_ids     TEXT,
  product_titles  TEXT,
  external_id     TEXT,  -- e.g. Shopify draft order GID
  checkout_url    TEXT,
  order_id        TEXT,
  created_at      INTEGER
);
CREATE INDEX IF NOT EXISTS pending_checkouts_session_idx ON pending_checkouts (session_id);
