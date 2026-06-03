import { defineConfig } from "drizzle-kit";

// Cloudflare D1 (SQLite) — schema source lives in shared/schema.ts.
// Use `npx drizzle-kit generate` to emit SQL migrations into ./migrations,
// then apply them to D1 with:
//   npx wrangler d1 migrations apply testbankbooks --remote
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
});
