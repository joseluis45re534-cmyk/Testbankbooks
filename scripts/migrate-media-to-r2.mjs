#!/usr/bin/env node
// One-time migration: copy product images + download files from the old
// Replit server into your Cloudflare R2 bucket, preserving their paths.
//
// After this runs, the existing DB URLs (https://nurstestbank.com/uploads/...)
// resolve through functions/uploads/[[path]].ts, which serves them from R2.
//
// Requirements: Node 18+ (global fetch) and wrangler logged in.
//
// Usage:
//   node scripts/migrate-media-to-r2.mjs
//   SOURCE_BASE=https://testbankbooks.replit.app BUCKET=testbankbooks-uploads node scripts/migrate-media-to-r2.mjs
//   DRY_RUN=1 node scripts/migrate-media-to-r2.mjs      # list what would copy, don't upload

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE_BASE = process.env.SOURCE_BASE || "https://testbankbooks.replit.app";
const BUCKET = process.env.BUCKET || "testbankbooks-uploads";
const DRY_RUN = process.env.DRY_RUN === "1";
const SEED = "migrations/seed_products.sql";

const CONTENT_TYPES = {
  webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", svg: "image/svg+xml", avif: "image/avif",
  pdf: "application/pdf", zip: "application/zip", rar: "application/vnd.rar",
  epub: "application/epub+zip",
};
const ctFor = (k) => CONTENT_TYPES[k.split(".").pop()?.toLowerCase()] || "application/octet-stream";

// Collect every /uploads/... path referenced in the product seed (covers
// image_url, additional_images JSON arrays, and download_path).
const sql = readFileSync(SEED, "utf8");
const paths = new Set();
const re = /\/uploads\/(?:images|downloads)\/[^'"),\s\]]+/g;
let m;
while ((m = re.exec(sql)) !== null) paths.add(m[0]);

const list = [...paths].sort();
console.log(`Found ${list.length} unique /uploads paths in ${SEED}`);
console.log(`Source: ${SOURCE_BASE}   Bucket: ${BUCKET}   ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

const tmp = join(tmpdir(), "r2-migrate");
mkdirSync(tmp, { recursive: true });

let ok = 0, skipped = 0, failed = 0;
const failures = [];

for (let i = 0; i < list.length; i++) {
  const path = list[i];                 // e.g. /uploads/images/1494/main.webp
  const key = path.replace(/^\/uploads\//, ""); // R2 key: images/1494/main.webp
  const srcUrl = SOURCE_BASE + path;
  const label = `[${i + 1}/${list.length}] ${key}`;

  if (DRY_RUN) { console.log(`would copy  ${label}`); ok++; continue; }

  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      console.log(`SKIP ${res.status}  ${label}`);
      skipped++;
      failures.push(`${res.status}  ${srcUrl}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const tmpFile = join(tmp, key.replace(/[\/\\]/g, "_"));
    writeFileSync(tmpFile, buf);

    execFileSync(
      "npx",
      ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
        "--file", tmpFile, "--content-type", ctFor(key), "--remote"],
      { stdio: "ignore", shell: process.platform === "win32" },
    );
    rmSync(tmpFile, { force: true });
    console.log(`OK  (${(buf.length / 1024).toFixed(0)} KB)  ${label}`);
    ok++;
  } catch (err) {
    console.log(`FAIL  ${label}  — ${err.message}`);
    failed++;
    failures.push(`ERROR ${srcUrl}  ${err.message}`);
  }
}

console.log(`\n──────────\nDone. Uploaded: ${ok}   Skipped(missing): ${skipped}   Failed: ${failed}`);
if (failures.length) {
  writeFileSync("migrations/media-migration-failures.txt", failures.join("\n"));
  console.log(`Failures written to migrations/media-migration-failures.txt`);
}
