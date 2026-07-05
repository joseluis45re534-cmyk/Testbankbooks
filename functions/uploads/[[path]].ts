// Serves self-hosted media (product images + download files) from the R2
// bucket bound as UPLOADS. A request for /uploads/images/1494/main.webp maps
// to the R2 object key "images/1494/main.webp". This replaces the old Replit
// /uploads static hosting — the files now live on your own Cloudflare R2.

interface Env {
  UPLOADS: R2Bucket;
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
