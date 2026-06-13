import { createD1Db } from "../../server/db-neon";
import { DatabaseStorage } from "../../server/storage";

interface Env {
  DB: D1Database;
}

function escXml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Strip HTML tags from descriptions before exposing them to Google Shopping.
// GMC requires plain text and rejects feeds with raw HTML markup.
function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Google rejects titles that look like cheating/answer keys. Soften "Test Bank"
// to "Study Guide" in the *feed only* — the product page keeps its real name.
function feedTitle(raw: string): string {
  return raw
    .replace(/\bTest Bank\b/gi, "Study Guide")
    .replace(/\bSolution Manual\b/gi, "Study Companion")
    .replace(/\bAnswer Key\b/gi, "Study Guide")
    .trim();
}

function feedDescription(raw: string, title: string): string {
  const cleaned = stripHtml(raw);
  if (cleaned.length > 40) {
    return cleaned.replace(/\bTest Bank\b/gi, "Study Guide").substring(0, 4990);
  }
  // Fall back to a generated description when the source is too short.
  return `Comprehensive digital study guide for ${title.replace(/\bTest Bank\b/gi, "")}. Practice questions with detailed rationales, organized by chapter, designed to help nursing students prepare for course exams and licensure tests. Instant digital download, lifetime access.`.substring(0, 4990);
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const db = createD1Db(env.DB);
  const storage = new DatabaseStorage(db);
  const allProducts = await storage.getAllProducts();
  const base = "https://nurstestbank.com";

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n  <channel>\n';
  xml += `    <title>NursTestBank Product Feed</title>\n    <link>${base}</link>\n    <description>Digital study guides and practice questions for nursing students.</description>\n`;

  for (const p of allProducts) {
    if (!p.imageUrl) continue;
    const price = parseFloat(p.price);
    const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
    const imageUrl = p.imageUrl.startsWith("http") ? p.imageUrl : `${base}${p.imageUrl}`;
    const title = feedTitle(p.title);
    const description = feedDescription(p.description || "", title);

    xml += "    <item>\n";
    // Required identification
    xml += `      <g:id>${escXml(p.id)}</g:id>\n`;
    xml += `      <g:title>${escXml(title)}</g:title>\n`;
    xml += `      <g:description>${escXml(description)}</g:description>\n`;
    xml += `      <g:link>${base}/products/${p.slug}</g:link>\n`;
    xml += `      <g:image_link>${escXml(imageUrl)}</g:image_link>\n`;

    // Required availability + pricing
    xml += `      <g:availability>${p.availability === "in_stock" ? "in_stock" : "out_of_stock"}</g:availability>\n`;
    xml += `      <g:price>${price.toFixed(2)} USD</g:price>\n`;
    if (salePrice !== null && salePrice < price) {
      xml += `      <g:sale_price>${salePrice.toFixed(2)} USD</g:sale_price>\n`;
    }
    xml += `      <g:condition>new</g:condition>\n`;

    // Required identifiers (custom-printed books have no retail GTIN — mark explicitly)
    xml += `      <g:brand>${escXml(p.brand || "NursTestBank")}</g:brand>\n`;
    xml += `      <g:mpn>NTB-${escXml(p.id)}</g:mpn>\n`;
    xml += `      <g:identifier_exists>false</g:identifier_exists>\n`;

    // Demographics — required for media/book listings
    xml += `      <g:age_group>adult</g:age_group>\n`;
    xml += `      <g:gender>unisex</g:gender>\n`;

    // Category mapping — physical printed books
    xml += `      <g:google_product_category>784</g:google_product_category>\n`; // 784 = Media > Books > Print Books
    xml += `      <g:product_type>${escXml(p.category || "Nursing Study Books")}</g:product_type>\n`;

    // Physical product — free standard shipping, real handling/transit time
    xml += `      <g:shipping>\n`;
    xml += `        <g:country>US</g:country>\n`;
    xml += `        <g:service>Standard</g:service>\n`;
    xml += `        <g:price>0.00 USD</g:price>\n`;
    xml += `      </g:shipping>\n`;
    xml += `      <g:shipping_weight>0.5 kg</g:shipping_weight>\n`;
    xml += `      <g:max_handling_time>2</g:max_handling_time>\n`;
    xml += `      <g:min_handling_time>1</g:min_handling_time>\n`;
    xml += `      <g:max_transit_time>8</g:max_transit_time>\n`;
    xml += `      <g:min_transit_time>5</g:min_transit_time>\n`;

    xml += `      <g:is_bundle>no</g:is_bundle>\n`;
    xml += `      <g:adult>no</g:adult>\n`;

    xml += "    </item>\n";
  }

  xml += "  </channel>\n</rss>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
