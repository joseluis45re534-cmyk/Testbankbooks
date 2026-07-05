-- Rate limiting counters (sliding fixed-window per key).
-- Apply: npx wrangler d1 execute nurstestbank --remote --file=migrations/0002_rate_limits.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT PRIMARY KEY,
  count     INTEGER NOT NULL DEFAULT 0,
  reset_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);
