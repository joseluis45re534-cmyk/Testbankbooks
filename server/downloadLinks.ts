// Signed, expiring links for paid download files stored in R2.
//
// Files under R2 "downloads/" are no longer publicly fetchable. The API hands
// out /uploads/downloads/<file>?exp=<unix>&sig=<hmac> links only for paid
// orders, and functions/uploads/[[path]].ts verifies the signature. Stateless
// HMAC (keyed by SESSION_SECRET) — no DB lookup per download.

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

// Hosts whose /uploads/ paths are really our own R2 bucket.
const SELF_HOSTS = ["nurstestbank.com", "www.nurstestbank.com", "testbankbooks.com", "testbankbooks.replit.app"];

function b64url(bytes: ArrayBuffer): string {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** R2 key ("downloads/x.zip") for a product downloadPath on our own bucket, or null if external. */
export function r2KeyForDownloadPath(downloadPath: string): string | null {
  let path = downloadPath.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      if (!SELF_HOSTS.includes(url.hostname.toLowerCase())) return null;
      path = url.pathname;
    } catch {
      return null;
    }
  }
  if (!path.startsWith("/uploads/")) return null;
  return decodeURIComponent(path.slice("/uploads/".length));
}

/** Download URL to hand a paying customer. External links pass through unchanged. */
export async function signedDownloadUrl(
  downloadPath: string,
  secret: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const key = r2KeyForDownloadPath(downloadPath);
  if (!key) return downloadPath;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmac(secret, `${key}|${exp}`);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `/uploads/${encodedKey}?exp=${exp}&sig=${sig}`;
}

export async function verifyDownloadSignature(
  key: string,
  exp: string | null,
  sig: string | null,
  secret: string,
): Promise<boolean> {
  if (!exp || !sig || !secret) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(await hmac(secret, `${key}|${expNum}`), sig);
}
