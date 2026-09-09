// Runs in front of every request to this CF Pages project (static assets,
// the SPA-fallback index.html, and /api/* functions alike).
//
// Its one job: inject the admin's custom Header/Body/Footer HTML (set in
// Admin -> Settings -> Custom HTML, e.g. site-verification meta tags,
// analytics snippets) into the raw HTML response BEFORE it reaches the
// browser. This has to happen server-side because verification bots
// (Google Search Console, Google Merchant Center, etc.) read the initial
// HTML response and do not execute client-side JavaScript — a tag injected
// via React after page load is invisible to them.
//
// (Historically this injection happened in the old Express server —
// server/static.ts's injectCustomHtml/getCustomHtmlTagsForSsr — which ran
// in production before the site moved to Cloudflare Pages. That code path
// no longer runs at all on Pages, so custom HTML has been silently inert
// in production since the migration. This middleware replaces it.)

import { createD1Db } from "../server/db-neon";
import { siteSettings } from "../shared/schema";
import { or, eq } from "drizzle-orm";

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.next();

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  try {
    const db = createD1Db(context.env.DB);
    const rows = await db
      .select()
      .from(siteSettings)
      .where(
        or(
          eq(siteSettings.key, "headerHtml"),
          eq(siteSettings.key, "bodyHtml"),
          eq(siteSettings.key, "footerHtml"),
        ),
      );

    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value || "";

    const headerHtml = settings.headerHtml || "";
    const bodyHtml = settings.bodyHtml || "";
    const footerHtml = settings.footerHtml || "";

    if (!headerHtml && !bodyHtml && !footerHtml) {
      return response;
    }

    let html = await response.text();
    if (headerHtml) html = html.replace("</head>", `${headerHtml}\n</head>`);
    if (bodyHtml) html = html.replace(/<body([^>]*)>/, (_m, attrs) => `<body${attrs}>\n${bodyHtml}`);
    if (footerHtml) html = html.replace("</body>", `${footerHtml}\n</body>`);

    const headers = new Headers(response.headers);
    // The HTML now carries admin-editable content — don't let CDN/browser
    // caches serve a stale copy after the admin changes a tag.
    headers.set("Cache-Control", "public, max-age=60, must-revalidate");

    return new Response(html, { status: response.status, headers });
  } catch (err) {
    // Fail open — a broken settings query must never take the site down.
    console.error("Custom HTML injection failed:", err);
    return response;
  }
};
