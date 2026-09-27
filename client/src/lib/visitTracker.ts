// Sends one page view per route change to /api/visit for Admin -> Analytics.
// The first view of a page load also carries the referrer and the landing
// query string (utm_*, gclid, fbclid, ...), which is where the visit's source
// comes from. Admin pages are never tracked.

const SESSION_COOKIE = "tbb_vs";
const SESSION_IDLE_SECONDS = 30 * 60;

let landingSent = false;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

// Refreshed on every page view, so a visit ends after 30 idle minutes. The
// server reads the same cookie when it records cart and checkout steps.
function touchSessionCookie() {
  const existing = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${existing || randomId()}; Max-Age=${SESSION_IDLE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

export function trackPageView(path: string) {
  try {
    if (path.startsWith("/owner")) return;
    touchSessionCookie();

    const payload: { p: string; l?: boolean; r?: string; q?: string } = { p: path };
    if (!landingSent) {
      landingSent = true;
      payload.l = true;
      payload.r = document.referrer || "";
      payload.q = location.search || "";
    }

    const body = JSON.stringify(payload);
    const queued = navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }));
    if (!queued) {
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => {});
    }
  } catch {
    // Analytics must never break the storefront.
  }
}
