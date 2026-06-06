#!/usr/bin/env node
// One-off: convert a WooCommerce product export CSV into a D1 SQL file
// you can apply with `wrangler d1 execute`.
//
// Usage:
//   node scripts/import-products-from-csv.mjs <path-to-csv> [output.sql]
//
// Defaults output to migrations/seed_products.sql

import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync } from "node:fs";

const csvPath = process.argv[2];
const outPath = process.argv[3] || "migrations/seed_products.sql";

if (!csvPath) {
  console.error("Usage: node scripts/import-products-from-csv.mjs <csv> [out.sql]");
  process.exit(1);
}

const raw = readFileSync(csvPath, "utf8");
const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

// SQLite TEXT literal escape — wrap in single quotes, double any internal single quotes.
const q = (v) => (v == null || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

const slugify = (title, id) =>
  title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 200) +
  "-" + id;

let count = 0;
let sql = "-- Seed: products from WooCommerce CSV\n";
sql += "-- Apply: npx wrangler d1 execute nurstestbank --remote --file=migrations/seed_products.sql\n\n";

for (const r of records) {
  const id = r.ID || r.SKU;
  const title = r.Name || "";
  if (!id || !title) continue;

  const description = r.Description || r["Short description"] || "";
  const price = r["Regular price"] || "0";
  const salePrice = r["Sale price"] || null;

  // Images: comma-separated; first is the main image, rest go into additional_images JSON array
  const imageList = (r.Images || "").split(",").map((s) => s.trim()).filter(Boolean);
  const imageUrl = imageList[0] || null;
  const additionalImages = imageList.slice(1);

  const category = (r.Categories || "").split(",")[0]?.trim() || null;
  const tagList = (r.Tags || "").split(",").map((s) => s.trim()).filter(Boolean);
  const downloadPath = r["Download 1 URL"] || null;
  const slug = slugify(title, id);

  sql +=
    `INSERT OR REPLACE INTO products ` +
    `(id, title, description, price, sale_price, image_url, additional_images, availability, condition, category, slug, tags, download_path, woo_product_id) ` +
    `VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${q(price)}, ${q(salePrice)}, ${q(imageUrl)}, ${q(JSON.stringify(additionalImages))}, 'in_stock', 'new', ${q(category)}, ${q(slug)}, ${q(JSON.stringify(tagList))}, ${q(downloadPath)}, ${q(id)});\n`;

  count++;
}

writeFileSync(outPath, sql);
console.log(`✓ Wrote ${count} products to ${outPath}`);
