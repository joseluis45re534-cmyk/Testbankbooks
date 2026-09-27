// First-party visit analytics behind Admin -> Analytics. Classifies where a
// visit came from, records page views and checkout steps in D1 (table
// analytics_events, migration 0005), and builds the admin report.
//
// Privacy: no IP address or other personal data is stored. visitor_id is a
// SHA-256 of (secret, UTC day, IP, user agent), so it cannot be reversed and
// changes every day. session_id is a random ID from a 30-minute cookie.

export const VISIT_COOKIE = "tbb_vs";

export type EventType = "pageview" | "add_to_cart" | "begin_checkout" | "purchase";

export type AnalyticsEvent = {
  type: EventType;
  sessionId?: string | null;
  visitorId?: string | null;
  path?: string | null;
  source?: string | null;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  country?: string | null;
  device?: string | null;
  productId?: string | null;
  value?: number | null;
  orderId?: string | null;
};

// ─── Where a visit came from ─────────────────────────────────────────────────

const SELF_HOSTS = ["nurstestbank.com", "testbankbooks.pages.dev"];

// Most specific first: gemini.google.com and mail.google.com must win over google.
const REFERRER_CHANNELS: [RegExp, string][] = [
  [/^gemini\.google\.com$/, "Gemini"],
  [/^mail\.google\.com$/, "Gmail"],
  [/^outlook\.(live|office|office365)\.com$/, "Outlook"],
  [/^mail\.yahoo\.com$/, "Yahoo Mail"],
  [/(^|\.)googleadservices\.com$/, "Google Ads"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)yahoo\.[a-z.]+$/, "Yahoo"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yandex\.[a-z.]+$/, "Yandex"],
  [/(^|\.)baidu\.com$/, "Baidu"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)search\.brave\.com$/, "Brave Search"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/^(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, "Pinterest"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/^(t\.me|telegram\.org|web\.telegram\.org)$/, "Telegram"],
  [/(^|\.)quora\.com$/, "Quora"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)copilot\.microsoft\.com$/, "Copilot"],
];

// Click IDs that ad platforms append to landing URLs. They beat the referrer,
// which is often stripped or only says "google.com". srsltid comes from
// Merchant Center auto-tagging on free product listings.
const CLICK_IDS: [string, string][] = [
  ["gclid", "Google Ads"],
  ["gbraid", "Google Ads"],
  ["wbraid", "Google Ads"],
  ["msclkid", "Microsoft Ads"],
  ["ttclid", "TikTok Ads"],
  ["fbclid", "Facebook"],
  ["srsltid", "Google Shopping"],
];

const KNOWN_UTM_SOURCES: Record<string, string> = {
  google: "Google", bing: "Bing", facebook: "Facebook", fb: "Facebook", meta: "Facebook",
  instagram: "Instagram", ig: "Instagram", tiktok: "TikTok", youtube: "YouTube", pinterest: "Pinterest",
  twitter: "X (Twitter)", x: "X (Twitter)", linkedin: "LinkedIn", reddit: "Reddit",
  whatsapp: "WhatsApp", telegram: "Telegram", newsletter: "Email", email: "Email",
};

const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid[_-]search|paid[_-]?social|cpm|display|ads?)$/i;

function clean(value: string | null, max = 100): string | null {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
}

function isSelfHost(host: string): boolean {
  return SELF_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function utmChannel(utmSource: string, utmMedium: string | null): string {
  const key = utmSource.toLowerCase();
  const name = KNOWN_UTM_SOURCES[key] ?? utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  if (utmMedium && PAID_MEDIUM.test(utmMedium)) return `${name} Ads`;
  if (utmMedium?.toLowerCase() === "email") return "Email";
  return name;
}

/** Channel of a landing page view, from its referrer and landing query string. */
export function classifyVisit(referrer: string | null, query: string | null) {
  const params = new URLSearchParams(query || "");
  const utmSource = clean(params.get("utm_source"));
  const utmMedium = clean(params.get("utm_medium"));
  const utmCampaign = clean(params.get("utm_campaign"), 150);

  let referrerHost: string | null = null;
  try {
    if (referrer) {
      const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
      if (host && !isSelfHost(host)) referrerHost = host.slice(0, 120);
    }
  } catch {
    // not a URL: treat as no referrer
  }
  const referrerChannel = referrerHost
    ? REFERRER_CHANNELS.find(([re]) => re.test(referrerHost!))?.[1] ?? referrerHost
    : null;

  let source: string;
  const clickId = CLICK_IDS.find(([param]) => params.has(param));
  if (clickId) {
    source = clickId[0] === "fbclid" && referrerChannel === "Instagram" ? "Instagram" : clickId[1];
  } else if (utmSource) {
    source = utmChannel(utmSource, utmMedium);
  } else {
    source = referrerChannel ?? "Direct";
  }
  return { source, referrerHost, utmSource, utmMedium, utmCampaign };
}

// ─── Who is visiting ─────────────────────────────────────────────────────────

const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|python|curl|wget|httpclient|go-http|java\/|axios|node-fetch|okhttp|monitor|pingdom|uptime|ahrefs|semrush|mj12|petalbot|bytespider|gptbot|claudebot|ccbot/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || userAgent.length < 20 || BOT_UA.test(userAgent);
}

export function deviceFromUA(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return "mobile";
  return "desktop";
}

/** Anonymous visitor ID: unique per visitor per UTC day, never reversible to an IP. */
export async function dailyVisitorId(secret: string, ip: string, userAgent: string, now = Date.now()): Promise<string> {
  const day = new Date(now).toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}|${day}|${ip}|${userAgent}`));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function recordEvent(db: D1Database, e: AnalyticsEvent) {
  return db
    .prepare(
      `INSERT INTO analytics_events (created_at, type, session_id, visitor_id, path, source, referrer_host,
         utm_source, utm_medium, utm_campaign, country, device, product_id, value, order_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    )
    .bind(
      Date.now(), e.type, e.sessionId ?? null, e.visitorId ?? null, e.path ?? null, e.source ?? null,
      e.referrerHost ?? null, e.utmSource ?? null, e.utmMedium ?? null, e.utmCampaign ?? null,
      e.country ?? null, e.device ?? null, e.productId ?? null, e.value ?? null, e.orderId ?? null,
    )
    .run();
}

// ─── Admin report ────────────────────────────────────────────────────────────

export type ReportRange = {
  from: string; // YYYY-MM-DD, in the admin's time zone
  to: string;
  tz: number; // Date.getTimezoneOffset() of the admin's browser, in minutes
  startMs: number;
  endMs: number;
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayStartUtcMs(date: string, tz: number): number | null {
  const m = DATE_RE.exec(date);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  // Date.UTC rolls 2026-13-01 over into 2027; only accept real calendar days.
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) return null;
  return ms + tz * 60_000;
}

/** Validates a from/to day range (inclusive) and turns it into UTC milliseconds. */
export function parseRange(from: string | undefined, to: string | undefined, tzRaw: string | undefined): ReportRange | null {
  const tz = Math.max(-840, Math.min(840, Math.round(Number(tzRaw) || 0)));
  const today = new Date(Date.now() - tz * 60_000).toISOString().slice(0, 10);
  const toDay = to || today;
  const fromDay = from || new Date(Date.parse(toDay) - 29 * 86_400_000).toISOString().slice(0, 10);
  const startMs = dayStartUtcMs(fromDay, tz);
  const toStart = dayStartUtcMs(toDay, tz);
  if (startMs === null || toStart === null || toStart < startMs) return null;
  const endMs = toStart + 86_400_000;
  if (endMs - startMs > 400 * 86_400_000) return null;
  return { from: fromDay, to: toDay, tz, startMs, endMs };
}

const PAID = "status IN ('paid', 'completed')";
const DAY = "date(created_at / 1000 - ?3 * 60, 'unixepoch')";

// One row per session in the range. The source, landing page, country and
// device come from the session's first page view.
const SESSIONS = `
  WITH ev AS (
    SELECT * FROM analytics_events
    WHERE created_at >= ?1 AND created_at < ?2 AND session_id IS NOT NULL
  ),
  agg AS (
    SELECT session_id,
           SUM(type = 'pageview') AS pageviews,
           MAX(type = 'add_to_cart') AS carted,
           MAX(type = 'begin_checkout') AS checkout,
           MAX(type = 'purchase') AS purchased,
           SUM(CASE WHEN type = 'purchase' THEN value ELSE 0 END) AS revenue,
           MAX(country) AS any_country,
           MAX(device) AS any_device
    FROM ev GROUP BY session_id
  ),
  landing AS (
    SELECT * FROM (
      SELECT session_id, source, referrer_host, utm_source, utm_medium, utm_campaign, path, country, device,
             ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at, id) AS rn
      FROM ev WHERE type = 'pageview'
    ) WHERE rn = 1
  ),
  sess AS (
    SELECT agg.*,
           CASE WHEN landing.session_id IS NULL THEN 'Unknown' ELSE COALESCE(landing.source, 'Direct') END AS source,
           landing.referrer_host, landing.utm_source, landing.utm_medium, landing.utm_campaign,
           landing.path AS landing_path,
           COALESCE(landing.country, agg.any_country) AS country,
           COALESCE(landing.device, agg.any_device) AS device
    FROM agg LEFT JOIN landing ON landing.session_id = agg.session_id
  )`;

const SESSION_METRICS = `COUNT(*) AS sessions, SUM(pageviews) AS pageviews, SUM(carted) AS carts,
  SUM(checkout) AS checkouts, SUM(purchased) AS orders, ROUND(SUM(revenue), 2) AS revenue`;

function breakdown(dimensions: string, where = "") {
  return `${SESSIONS}
    SELECT ${dimensions}, ${SESSION_METRICS}
    FROM sess ${where ? `WHERE ${where}` : ""}
    GROUP BY ${dimensions}
    ORDER BY sessions DESC LIMIT 200`;
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86_400_000) days.push(new Date(t).toISOString().slice(0, 10));
  return days;
}

const num = (v: unknown) => Number(v) || 0;

export async function buildAnalyticsReport(db: D1Database, r: ReportRange) {
  const now = Date.now();
  const prevStart = r.startMs - (r.endMs - r.startMs);
  // D1 rejects unused bound parameters, so each helper binds exactly what its SQL uses.
  const q = (sql: string) => db.prepare(sql).bind(r.startMs, r.endMs);
  const qPrev = (sql: string) => db.prepare(sql).bind(prevStart, r.startMs);
  const qByDay = (sql: string) => db.prepare(sql).bind(r.startMs, r.endMs, r.tz);

  const totalsSql = `
    SELECT COUNT(DISTINCT CASE WHEN type = 'pageview' THEN session_id END) AS sessions,
           SUM(type = 'pageview') AS pageviews,
           (SELECT COUNT(*) FROM (
              SELECT DISTINCT date(created_at / 1000, 'unixepoch'), visitor_id FROM analytics_events
              WHERE type = 'pageview' AND created_at >= ?1 AND created_at < ?2)) AS visitors
    FROM analytics_events WHERE created_at >= ?1 AND created_at < ?2`;
  const orderTotalsSql = `
    SELECT COUNT(*) AS orders, COALESCE(ROUND(SUM(CAST(amount AS REAL)), 2), 0) AS revenue
    FROM orders WHERE ${PAID} AND created_at >= ?1 AND created_at < ?2`;

  const results = await db.batch([
    // 0 daily traffic
    qByDay(`SELECT ${DAY} AS day,
              COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_id END) AS visitors,
              COUNT(DISTINCT CASE WHEN type = 'pageview' THEN session_id END) AS sessions,
              SUM(type = 'pageview') AS pageviews,
              COUNT(DISTINCT CASE WHEN type = 'add_to_cart' THEN session_id END) AS carts,
              COUNT(DISTINCT CASE WHEN type = 'begin_checkout' THEN session_id END) AS checkouts
       FROM analytics_events WHERE created_at >= ?1 AND created_at < ?2 GROUP BY day`),
    // 1 daily sales (orders table is the source of truth for money)
    qByDay(`SELECT ${DAY} AS day, COUNT(*) AS orders, ROUND(SUM(CAST(amount AS REAL)), 2) AS revenue
       FROM orders WHERE ${PAID} AND created_at >= ?1 AND created_at < ?2 GROUP BY day`),
    // 2-5 totals, this period and the one before it
    q(totalsSql),
    qPrev(totalsSql),
    q(orderTotalsSql),
    qPrev(orderTotalsSql),
    // 6-11 session breakdowns
    q(breakdown("source")),
    q(breakdown("referrer_host", "referrer_host IS NOT NULL")),
    q(breakdown("utm_source, utm_medium, utm_campaign", "utm_source IS NOT NULL OR utm_campaign IS NOT NULL")),
    q(breakdown("landing_path", "landing_path IS NOT NULL")),
    q(breakdown("country")),
    q(breakdown("device")),
    // 12 pages
    q(`SELECT path, COUNT(*) AS pageviews, COUNT(DISTINCT session_id) AS sessions
       FROM analytics_events WHERE type = 'pageview' AND created_at >= ?1 AND created_at < ?2
       GROUP BY path ORDER BY pageviews DESC LIMIT 200`),
    // 13-15 products: views, add to cart, sold
    q(`SELECT p.id, p.title, COUNT(*) AS views
       FROM analytics_events e JOIN products p ON p.slug = substr(e.path, 11)
       WHERE e.type = 'pageview' AND e.path LIKE '/products/%' AND e.created_at >= ?1 AND e.created_at < ?2
       GROUP BY p.id`),
    q(`SELECT e.product_id AS id, p.title, COUNT(*) AS adds
       FROM analytics_events e LEFT JOIN products p ON p.id = e.product_id
       WHERE e.type = 'add_to_cart' AND e.product_id IS NOT NULL AND e.created_at >= ?1 AND e.created_at < ?2
       GROUP BY e.product_id`),
    q(`SELECT j.value AS id, p.title, COUNT(*) AS sold
       FROM orders o, json_each(o.product_ids) j LEFT JOIN products p ON p.id = j.value
       WHERE o.${PAID} AND o.created_at >= ?1 AND o.created_at < ?2
       GROUP BY j.value`),
    // 16 funnel
    q(`SELECT COUNT(DISTINCT session_id) AS sessions,
              COUNT(DISTINCT CASE WHEN type = 'pageview' AND path LIKE '/products/%' THEN session_id END) AS productViews,
              COUNT(DISTINCT CASE WHEN type = 'add_to_cart' THEN session_id END) AS carts,
              COUNT(DISTINCT CASE WHEN type = 'begin_checkout' THEN session_id END) AS checkouts,
              COUNT(DISTINCT CASE WHEN type = 'purchase' THEN session_id END) AS purchases
       FROM analytics_events WHERE created_at >= ?1 AND created_at < ?2 AND session_id IS NOT NULL`),
    // 17-18 live: the last 30 minutes, whatever the selected range
    db.prepare(`SELECT COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE created_at >= ?1`).bind(now - 30 * 60_000),
    db.prepare(`SELECT path, COUNT(DISTINCT session_id) AS sessions FROM analytics_events
                WHERE type = 'pageview' AND created_at >= ?1 GROUP BY path ORDER BY sessions DESC LIMIT 10`).bind(now - 30 * 60_000),
    // 19 recent activity
    db.prepare(`SELECT created_at AS at, type, path, source, referrer_host AS referrer, country, device, value,
                       substr(session_id, 1, 6) AS visitor
                FROM analytics_events ORDER BY id DESC LIMIT 60`),
    // 20 tracking start
    db.prepare(`SELECT MIN(created_at) AS first FROM analytics_events`),
  ]);
  const rows = (i: number) => (results[i]?.results ?? []) as any[];

  const traffic = new Map(rows(0).map((x) => [x.day, x]));
  const sales = new Map(rows(1).map((x) => [x.day, x]));
  const daily = eachDay(r.from, r.to).map((day) => {
    const t = traffic.get(day) ?? {};
    const s = sales.get(day) ?? {};
    return {
      day,
      visitors: num(t.visitors), sessions: num(t.sessions), pageviews: num(t.pageviews),
      carts: num(t.carts), checkouts: num(t.checkouts), orders: num(s.orders), revenue: num(s.revenue),
    };
  });

  const totals = (traffic: any, orders: any) => {
    const sessions = num(traffic?.sessions);
    const orderCount = num(orders?.orders);
    const revenue = num(orders?.revenue);
    return {
      visitors: num(traffic?.visitors), sessions, pageviews: num(traffic?.pageviews),
      orders: orderCount, revenue,
      conversionRate: sessions ? (orderCount / sessions) * 100 : 0,
      averageOrder: orderCount ? revenue / orderCount : 0,
    };
  };

  const metrics = (x: any) => ({
    sessions: num(x.sessions), pageviews: num(x.pageviews), carts: num(x.carts),
    checkouts: num(x.checkouts), orders: num(x.orders), revenue: num(x.revenue),
  });

  const products = new Map<string, { id: string; title: string; views: number; adds: number; sold: number }>();
  const product = (x: any) => {
    const id = String(x.id);
    if (!products.has(id)) products.set(id, { id, title: x.title || `Product ${id}`, views: 0, adds: 0, sold: 0 });
    return products.get(id)!;
  };
  rows(13).forEach((x) => { product(x).views = num(x.views); });
  rows(14).forEach((x) => { product(x).adds = num(x.adds); });
  rows(15).forEach((x) => { product(x).sold = num(x.sold); });

  const funnel = rows(16)[0] ?? {};

  return {
    range: { from: r.from, to: r.to, tz: r.tz },
    trackingSince: rows(20)[0]?.first ? num(rows(20)[0].first) : null,
    totals: totals(rows(2)[0], rows(4)[0]),
    previous: totals(rows(3)[0], rows(5)[0]),
    daily,
    sources: rows(6).map((x) => ({ source: String(x.source), ...metrics(x) })),
    referrers: rows(7).map((x) => ({ host: String(x.referrer_host), ...metrics(x) })),
    campaigns: rows(8).map((x) => ({
      utmSource: x.utm_source ?? "", utmMedium: x.utm_medium ?? "", utmCampaign: x.utm_campaign ?? "", ...metrics(x),
    })),
    landingPages: rows(9).map((x) => ({ path: String(x.landing_path), ...metrics(x) })),
    countries: rows(10).map((x) => ({ country: x.country ?? "", ...metrics(x) })),
    devices: rows(11).map((x) => ({ device: x.device ?? "unknown", ...metrics(x) })),
    pages: rows(12).map((x) => ({ path: String(x.path), pageviews: num(x.pageviews), sessions: num(x.sessions) })),
    products: Array.from(products.values()),
    funnel: {
      sessions: num(funnel.sessions), productViews: num(funnel.productViews), carts: num(funnel.carts),
      checkouts: num(funnel.checkouts), purchases: num(funnel.purchases),
    },
    live: {
      sessions: num(rows(17)[0]?.sessions),
      pages: rows(18).map((x) => ({ path: String(x.path), sessions: num(x.sessions) })),
    },
    recent: rows(19).map((x) => ({
      at: num(x.at), type: String(x.type), path: x.path ?? null, source: x.source ?? null,
      referrer: x.referrer ?? null, country: x.country ?? null, device: x.device ?? null,
      value: x.value == null ? null : num(x.value), visitor: x.visitor ?? null,
    })),
  };
}

export type AnalyticsReport = Awaited<ReturnType<typeof buildAnalyticsReport>>;
