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
const PAGES = ["/", "/shop", "/about", "/contact", "/privacy-policy", "/terms-conditions", "/refund-policy", "/shipping-policy", "/blog"];

// DIGITAL-PURITY audit: these physical/shipping phrases must NOT appear anywhere.
// The store is 100% digital (email/download delivery only).
const RED_FLAGS = [
  /printed book/i,
  /physical (book|item|product|copy|shipment)/i,
  /\bship(s|ped|ping|ment)?\b(?!\w)/i,   // ship/ships/shipped/shipping/shipment (not "township")
  /free shipping/i,
  /tracking number/i,
  /in transit/i,
  /(ship|deliver|arrive|transit)\w*[^.]{0,30}\d\s*[–-]\s*\d\s*business days/i, // delivery window only (not refund processing)
  /\bmailed to you/i,                     // \b so it does NOT match "e-mailed to you"
  /delivered to your (door|address)/i,
  /on its way/i,
  /courier|postal service/i,
];

// Affirmations that SHOULD be present (confirming the digital model is clear).
const DIGITAL_SIGNALS = {
  "instant/digital download": /instant.*download|digital download|download link/i,
  "email delivery": /emailed to you|sent to (your|the) email|delivered.*email/i,
  "business email": /support@nurstestbank\.com/i,
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

    // Normalize before scanning:
    //  - drop the footer "Delivery Policy" link label (not a physical claim)
    //  - drop NEGATION clauses like "No physical items will be shipped" /
    //    "there are no shipping fees" so digital-affirming sentences that
    //    mention shipping-to-deny-it don't false-positive.
    const NEGATION = /\b(no|not|never|without|won'?t|will not|there (?:is|are) no)\b[^.!?]*/gi;
    const scan = text.replace(/Delivery Policy/gi, "").replace(NEGATION, "");
    const flags = RED_FLAGS.filter((re) => re.test(scan));
    totalFlags += flags.length;

    console.log(`\n=== ${path}  [HTTP ${status}, ${text.length} chars] ===`);
    if (flags.length) {
      console.log("  ❌ PHYSICAL/SHIPPING RED FLAGS:");
      for (const re of flags) {
        const m = scan.match(re);
        console.log(`     - ${re} → "${(m && m[0]) || ""}"`);
      }
    } else {
      console.log("  ✅ no physical/shipping phrases");
    }

    if (path === "/") {
      console.log("  Digital-delivery signals (homepage):");
      for (const [name, re] of Object.entries(DIGITAL_SIGNALS)) {
        console.log(`     ${re.test(text) || re.test(html) ? "✅" : "❌"} ${name}`);
      }
    }
  } catch (err) {
    console.log(`\n=== ${path} === ERROR: ${err.message}`);
  }
}

console.log(`\n──────────\nTOTAL red-flag hits across pages: ${totalFlags}`);
await browser.close();
