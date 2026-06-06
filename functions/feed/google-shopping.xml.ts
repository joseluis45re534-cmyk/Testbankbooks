import { createD1Db } from "../../server/db-neon";
import { DatabaseStorage } from "../../server/storage";

interface Env {
  DB: D1Database;
}

function escXml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const db = createD1Db(env.DB);
  const storage = new DatabaseStorage(db);
  const allProducts = await storage.getAllProducts();
  const base = "https://nurstestbank.com";

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n  <channel>\n';
  xml += `    <title>NursTestBank - Google Shopping Feed</title>\n    <link>${base}</link>\n    <description>Digital exam prep products for nursing students.</description>\n`;

  for (const p of allProducts) {
    if (!p.imageUrl) continue;
    const price = parseFloat(p.price);
    const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
    const imageUrl = p.imageUrl.startsWith("http") ? p.imageUrl : `${base}${p.imageUrl}`;
    xml += `    <item>\n      <g:id>${escXml(p.id)}</g:id>\n      <g:title>${escXml(p.title)}</g:title>\n`;
    xml += `      <g:description>${escXml(p.description || "")}</g:description>\n`;
    xml += `      <g:link>${base}/products/${p.slug}</g:link>\n      <g:image_link>${escXml(imageUrl)}</g:image_link>\n`;
    xml += `      <g:availability>${p.availability === "in_stock" ? "in_stock" : "out_of_stock"}</g:availability>\n`;
    xml += `      <g:price>${price.toFixed(2)} USD</g:price>\n      <g:condition>new</g:condition>\n`;
    if (salePrice !== null && salePrice < price) xml += `      <g:sale_price>${salePrice.toFixed(2)} USD</g:sale_price>\n`;
    xml += `      <g:brand>${escXml(p.brand || "NursTestBank")}</g:brand>\n      <g:identifier_exists>false</g:identifier_exists>\n      <g:google_product_category>5388</g:google_product_category>\n      <g:product_type>${escXml(p.category || "Digital Products")}</g:product_type>\n    </item>\n`;
  }

  xml += "  </channel>\n</rss>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
