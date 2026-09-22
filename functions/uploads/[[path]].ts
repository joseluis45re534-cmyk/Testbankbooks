// Serves self-hosted media (product images + download files) from the R2
// bucket bound as UPLOADS. A request for /uploads/images/1494/main.webp maps
// to the R2 object key "images/1494/main.webp". This replaces the old Replit
// /uploads static hosting — the files now live on your own Cloudflare R2.
//
// Paid files under "downloads/" require a signed, expiring link issued by
// /api/orders/:id/generate-download (or a logged-in admin). Images stay public.

import { jwtVerify } from "jose";
import { verifyDownloadSignature } from "../../server/downloadLinks";

interface Env {
  UPLOADS: R2Bucket;
  SESSION_SECRET: string;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function isAdminRequest(request: Request, secret: string): Promise<boolean> {
  const token = readCookie(request, "tbb_admin");
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

const MIME: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  pdf: "application/pdf",
  zip: "application/zip",
  rar: "application/vnd.rar",
  epub: "application/epub+zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function contentTypeFor(key: string, fallback?: string | null): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  return MIME[ext] || fallback || "application/octet-stream";
}

export const onRequest: PagesFunction<Env> = async ({ params, request, env }) => {
  // params.path is the [[path]] catch-all segments after /uploads/
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join("/") : String(parts || "");

  if (!key) return new Response("Not found", { status: 404 });

  if (key.startsWith("downloads/")) {
    const url = new URL(request.url);
    const exp = url.searchParams.get("exp");
    const sig = url.searchParams.get("sig");
    let decodedKey = key;
    try { decodedKey = decodeURIComponent(key); } catch {}
    const allowed =
      (await verifyDownloadSignature(key, exp, sig, env.SESSION_SECRET)) ||
      (decodedKey !== key && (await verifyDownloadSignature(decodedKey, exp, sig, env.SESSION_SECRET))) ||
      (await isAdminRequest(request, env.SESSION_SECRET));
    if (!allowed) {
      return new Response(
        "This download link has expired or is invalid. Open the link in your order confirmation email to get a fresh download link.",
        { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
  }

  const object = await env.UPLOADS.get(key);
  if (!object || !object.body) {
    return new Response("File not found", { status: 404 });
  }

  const isDownload = key.startsWith("downloads/");
  const headers = new Headers();
  headers.set("Content-Type", contentTypeFor(key, object.httpMetadata?.contentType));
  headers.set("etag", object.httpEtag);
  // Images cache long; downloadable files are not cached by shared caches.
  headers.set(
    "Cache-Control",
    isDownload ? "private, no-store" : "public, max-age=31536000, immutable",
  );
  if (isDownload) {
    const filename = key.split("/").pop() || "download";
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  // Honor conditional requests (cheap 304s for images).
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
};
