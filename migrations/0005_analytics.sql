-- First-party visit analytics behind Admin -> Analytics: one row per page view
-- or checkout step. No IP addresses or personal data are stored. visitor_id is
-- a salted hash that changes every day, and session_id is a random ID the
-- browser keeps for 30 minutes of inactivity.
-- Apply: npx wrangler d1 execute testbankbooks --remote --file=migrations/0005_analytics.sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    INTEGER NOT NULL,  -- unix ms
  type          TEXT NOT NULL,     -- pageview | add_to_cart | begin_checkout | purchase
  session_id    TEXT,
  visitor_id    TEXT,
  path          TEXT,
  source        TEXT,              -- channel of a landing page view: Google, Google Ads, Facebook, Direct, ...
  referrer_host TEXT,              -- external referring site, without "www."
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  country       TEXT,              -- ISO code from Cloudflare
  device        TEXT,              -- mobile | tablet | desktop
  product_id    TEXT,
  value         REAL,              -- purchase amount
  order_id      TEXT
);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events (session_id, created_at);
