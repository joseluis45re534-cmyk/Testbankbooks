-- Seeds the initial admin user for the Cloudflare D1 deployment.
-- Username: soufiane9911
-- Password: soufiane9911  (change it in Admin → Settings after first login)
-- Apply with:
--   npx wrangler d1 execute testbankbooks --remote --file=migrations/seed_admin.sql
INSERT OR IGNORE INTO admin_users (id, username, password, created_at)
VALUES (
  lower(hex(randomblob(16))),
  'soufiane9911',
  '$2b$10$pBMue0q/HPJaHs1qiTzGze9opPCvvdJzrSzHV0Ycpf9WKh76ApRDG',
  unixepoch() * 1000
);
