// Playwright audit: fetch the LIVE site as a real browser (bypasses the
// Cloudflare bot block that 403s plain fetch) and check for Google Merchant
// Center "Misrepresentation" policy signals.
//
// Setup (dev-only, NOT a build dependency — keep it out of package.json so it
// doesn't bloat the Cloudflare Pages build):
//   npm i -D playwright && npx playwright install chromium
// Run:
//   node scripts/policy-audit.mjs
//   AUDIT_BASE=https://staging.example.com node scripts/policy-audit.mjs
import { chromium } from "playwright";

const BASE = process.env.AUDIT_BASE || "https://nurstestbank.com";
const PAGES = ["/", "/shop", "/about", "/contact", "/privacy-policy", "/terms-conditions", "/refund-policy", "/shipping-policy"];

// Phrases that contradict the physical-shipping model or signal inconsistency.
const RED_FLAGS = [
  /fully digital/i,
  /100% digital/i,
  /no physical (product|shipping|item)/i,
  /instant download/i,
  /delivered (digitally|electronically)/i,
  /immediate download/i,
  /digital goods/i,
  /\bEST\b/,            // timezone mismatch vs France address
  /downloads? (are )?ready/i,
];

// Trust signals Google looks for under the misrepresentation policy.
const TRUST_SIGNALS = {
  "business email": /support@nurstestbank\.com/i,
  "phone number": /\+?\d[\d()\s-]{7,}/,
  "physical address": /Rue des Noyers|Lyon|France/i,
  "shipping policy link": /shipping/i,
  "refund/return policy link": /refund|return/i,
  "privacy policy link": /privacy/i,
  "terms link": /terms/i,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
});
const page = await ctx.newPage();

let totalFlags = 0;

for (const path of PAGES) {
  const url = BASE + path;
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    const status = resp ? resp.status() : "??";
    // Give the SPA a moment to render.
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    const html = await page.content();

    const flags = RED_FLAGS.filter((re) => re.test(text));
    totalFlags += flags.length;

    console.log(`\n=== ${path}  [HTTP ${status}, ${text.length} chars] ===`);
    if (flags.length) {
      console.log("  ❌ RED FLAGS:");
      for (const re of flags) {
        const m = text.match(re);
        console.log(`     - ${re} → "${(m && m[0]) || ""}"`);
      }
    } else {
      console.log("  ✅ no red-flag phrases");
    }

    // Only check trust signals on the homepage (footer is global).
    if (path === "/") {
      console.log("  Trust signals (homepage):");
      for (const [name, re] of Object.entries(TRUST_SIGNALS)) {
        console.log(`     ${re.test(text) || re.test(html) ? "✅" : "❌"} ${name}`);
      }
      console.log("  Transparency statements (footer, global):");
      const transparency = {
        "ships worldwide / international": /ships worldwide|international retailer/i,
        "currency stated (USD)": /US Dollars|USD/i,
        "registered address stated": /registered at|7 Rue des Noyers/i,
      };
      for (const [name, re] of Object.entries(transparency)) {
        console.log(`     ${re.test(text) ? "✅" : "❌"} ${name}`);
      }
    }
  } catch (err) {
    console.log(`\n=== ${path} === ERROR: ${err.message}`);
  }
}

console.log(`\n──────────\nTOTAL red-flag hits across pages: ${totalFlags}`);
await browser.close();
