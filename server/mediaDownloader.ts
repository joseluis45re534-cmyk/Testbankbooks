import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { db } from "./db";
import { products } from "@shared/schema";
import { eq, and, isNotNull, not, like } from "drizzle-orm";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const IMAGES_DIR = path.join(UPLOADS_DIR, "images");
const DOWNLOADS_DIR = path.join(UPLOADS_DIR, "downloads");

export interface DownloadProgress {
  status: "idle" | "running" | "done" | "error";
  total: number;
  completed: number;
  failed: number;
  current: string;
  errors: string[];
}

let imageProgress: DownloadProgress = {
  status: "idle", total: 0, completed: 0, failed: 0, current: "", errors: [],
};

let fileProgress: DownloadProgress = {
  status: "idle", total: 0, completed: 0, failed: 0, current: "", errors: [],
};

export function getDownloadProgress(): DownloadProgress {
  return { ...imageProgress };
}

export function getFileDownloadProgress(): DownloadProgress {
  return { ...fileProgress };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getImageExtension(url: string): string {
  const u = url.split("?")[0];
  const ext = path.extname(u).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) return ext;
  return ".jpg";
}

function getFileExtension(url: string, defaultExt = ".zip"): string {
  const u = url.split("?")[0];
  const ext = path.extname(u).toLowerCase();
  return ext || defaultExt;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
}

function downloadFile(url: string, dest: string, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return resolve();
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    const request = proto.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location!, dest, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
    });
    request.on("error", (err) => { file.close(); fs.unlink(dest, () => {}); reject(err); });
    request.on("timeout", () => {
      request.destroy();
      file.close();
      fs.unlink(dest, () => {});
      reject(new Error("Timeout"));
    });
  });
}

// ─── Bulk Image Download ────────────────────────────────────────────────────

async function downloadProductImages(product: any): Promise<{ imageUrl: string | null; additionalImages: string[] }> {
  const productDir = path.join(IMAGES_DIR, product.id.toString());
  ensureDir(productDir);

  let localImageUrl = product.imageUrl;
  let localAdditional: string[] = product.additionalImages || [];

  if (product.imageUrl && product.imageUrl.startsWith("http")) {
    try {
      const ext = getImageExtension(product.imageUrl);
      const dest = path.join(productDir, `main${ext}`);
      await downloadFile(product.imageUrl, dest);
      localImageUrl = `/uploads/images/${product.id}/main${ext}`;
    } catch (_e) { /* keep original */ }
  }

  const newAdditional: string[] = [];
  for (let i = 0; i < localAdditional.length; i++) {
    const imgUrl = localAdditional[i];
    if (imgUrl && imgUrl.startsWith("http")) {
      try {
        const ext = getImageExtension(imgUrl);
        const dest = path.join(productDir, `img_${i + 1}${ext}`);
        await downloadFile(imgUrl, dest);
        newAdditional.push(`/uploads/images/${product.id}/img_${i + 1}${ext}`);
      } catch (_e) { newAdditional.push(imgUrl); }
    } else {
      newAdditional.push(imgUrl);
    }
  }

  return { imageUrl: localImageUrl, additionalImages: newAdditional };
}

export async function startBulkImageDownload(): Promise<void> {
  if (imageProgress.status === "running") return;
  imageProgress = { status: "running", total: 0, completed: 0, failed: 0, current: "", errors: [] };

  setImmediate(async () => {
    try {
      ensureDir(IMAGES_DIR);
      const allProducts = await db.select().from(products);
      imageProgress.total = allProducts.length;

      for (const product of allProducts) {
        imageProgress.current = product.title || product.id.toString();
        try {
          const result = await downloadProductImages(product);
          await db.update(products).set(result).where(eq(products.id, product.id));
          imageProgress.completed++;
        } catch (err: any) {
          imageProgress.failed++;
          imageProgress.errors.push(`${product.id}: ${err.message}`);
        }
      }

      imageProgress.status = "done";
      imageProgress.current = "";
    } catch (err: any) {
      imageProgress.status = "error";
      imageProgress.errors.push(err.message);
    }
  });
}

// ─── Bulk File Download ─────────────────────────────────────────────────────

export async function startBulkFileDownload(): Promise<void> {
  if (fileProgress.status === "running") return;
  fileProgress = { status: "running", total: 0, completed: 0, failed: 0, current: "", errors: [] };

  setImmediate(async () => {
    try {
      ensureDir(DOWNLOADS_DIR);

      // Only fetch products with external download paths (not yet local)
      const allProducts = await db.select().from(products).where(
        and(
          isNotNull(products.downloadPath),
          not(like(products.downloadPath, "/uploads/%"))
        )
      );

      fileProgress.total = allProducts.length;

      for (const product of allProducts) {
        fileProgress.current = product.title || product.id.toString();
        try {
          const url = product.downloadPath!;
          const ext = getFileExtension(url, ".zip");
          const originalFilename = path.basename(url.split("?")[0]);
          const safeName = sanitizeFilename(originalFilename);
          const filename = safeName || `${product.id}${ext}`;
          const dest = path.join(DOWNLOADS_DIR, filename);

          // 5 minute timeout for large files
          await downloadFile(url, dest, 5 * 60 * 1000);

          const localPath = `/uploads/downloads/${filename}`;
          await db.update(products).set({ downloadPath: localPath }).where(eq(products.id, product.id));
          fileProgress.completed++;
        } catch (err: any) {
          fileProgress.failed++;
          fileProgress.errors.push(`${product.title || product.id}: ${err.message}`);
        }
      }

      fileProgress.status = "done";
      fileProgress.current = "";
    } catch (err: any) {
      fileProgress.status = "error";
      fileProgress.errors.push(err.message);
    }
  });
}

// ─── Manual Uploads ─────────────────────────────────────────────────────────

export function saveUploadedImage(productId: string, buffer: Buffer, originalname: string): string {
  const productDir = path.join(IMAGES_DIR, productId);
  ensureDir(productDir);
  const ext = path.extname(originalname).toLowerCase() || ".jpg";
  const filename = `main${ext}`;
  fs.writeFileSync(path.join(productDir, filename), buffer);
  return `/uploads/images/${productId}/${filename}`;
}

export function saveUploadedDownload(productId: string, buffer: Buffer, originalname: string): string {
  ensureDir(DOWNLOADS_DIR);
  const ext = path.extname(originalname) || ".zip";
  const safeName = sanitizeFilename(path.basename(originalname, ext));
  const filename = `${productId}_${safeName}${ext}`;
  fs.writeFileSync(path.join(DOWNLOADS_DIR, filename), buffer);
  return `/uploads/downloads/${filename}`;
}
