import { createD1Db } from "../server/db-neon";
import { DatabaseStorage } from "../server/storage";

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const db = createD1Db(env.DB);
  const storage = new DatabaseStorage(db);
  const [allProducts, blogPostsList] = await Promise.all([
    storage.getAllProducts(),
    storage.getPublishedBlogPosts(),
  ]);
  const base = "https://nurstestbank.com";

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const staticPages: [string, string, string][] = [
    ["/", "daily", "1.0"], ["/shop", "daily", "0.9"], ["/blog", "daily", "0.8"],
    ["/about", "monthly", "0.7"], ["/contact", "monthly", "0.6"],
    ["/privacy-policy", "yearly", "0.3"], ["/terms-conditions", "yearly", "0.3"],
    ["/refund-policy", "yearly", "0.3"], ["/shipping-policy", "yearly", "0.3"],
  ];
  for (const [path, freq, pri] of staticPages) {
    xml += `  <url>\n    <loc>${base}${path}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>\n`;
  }
  for (const p of allProducts) {
    xml += `  <url>\n    <loc>${base}/products/${p.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  for (const p of blogPostsList) {
    xml += `  <url>\n    <loc>${base}/blog/${p.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }
  xml += "</urlset>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
