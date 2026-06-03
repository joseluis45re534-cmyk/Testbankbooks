import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { siteSettings } from "@shared/schema";
import { inArray } from "drizzle-orm";

interface CustomHtmlTags {
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
}

let _cache: CustomHtmlTags | null = null;
let _cacheExpiry = 0;

export function invalidateCustomHtmlCache() {
  _cacheExpiry = 0;
}

export async function getCustomHtmlTagsForSsr(): Promise<CustomHtmlTags> {
  const now = Date.now();
  if (_cache && now < _cacheExpiry) return _cache;

  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, ["headerHtml", "bodyHtml", "footerHtml"]));

    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value || "";

    _cache = {
      headerHtml: map.headerHtml || "",
      bodyHtml: map.bodyHtml || "",
      footerHtml: map.footerHtml || "",
    };
    _cacheExpiry = now + 60_000;
    return _cache;
  } catch {
    return { headerHtml: "", bodyHtml: "", footerHtml: "" };
  }
}

export function injectCustomHtml(html: string, tags: CustomHtmlTags): string {
  if (tags.headerHtml) {
    html = html.replace("</head>", `${tags.headerHtml}\n</head>`);
  }
  if (tags.bodyHtml) {
    html = html.replace("<body>", `<body>\n${tags.bodyHtml}`);
  }
  if (tags.footerHtml) {
    html = html.replace("</body>", `${tags.footerHtml}\n</body>`);
  }
  return html;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA catch-all: inject custom HTML tags server-side so crawlers and
  // verification services see them without needing JavaScript to run.
  app.use("/{*path}", async (_req, res) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let html = fs.readFileSync(indexPath, "utf-8");
      const tags = await getCustomHtmlTagsForSsr();
      html = injectCustomHtml(html, tags);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
      res.send(html);
    } catch {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
