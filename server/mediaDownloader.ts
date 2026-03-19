import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { db } from "./db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const IMAGES_DIR = path.join(UPLOADS_DIR, "images");

export interface DownloadProgress {
  status: "idle" | "running" | "done" | "error";
  total: number;
  completed: number;
  failed: number;
  current: string;
  errors: string[];
}

let progress: DownloadProgress = {
  status: "idle",
  total: 0,
  completed: 0,
  failed: 0,
  current: "",
  errors: [],
};

export function getDownloadProgress(): DownloadProgress {
  return { ...progress };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getExtension(url: string): string {
  const u = url.split("?")[0];
  const ext = path.extname(u).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) return ext;
  return ".jpg";
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      return resolve();
    }
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    const request = proto.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    request.on("error", (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
    request.on("timeout", () => {
      request.destroy();
      file.close();
      fs.unlink(dest, () => {});
      reject(new Error("Timeout"));
    });
  });
}

async function downloadProductImages(product: any): Promise<{ imageUrl: string | null; additionalImages: string[] }> {
  const productDir = path.join(IMAGES_DIR, product.id.toString());
  ensureDir(productDir);

  let localImageUrl = product.imageUrl;
  let localAdditional: string[] = product.additionalImages || [];

  if (product.imageUrl && product.imageUrl.startsWith("http")) {
    try {
      const ext = getExtension(product.imageUrl);
      const filename = `main${ext}`;
      const dest = path.join(productDir, filename);
      await downloadFile(product.imageUrl, dest);
      localImageUrl = `/uploads/images/${product.id}/${filename}`;
    } catch (_e) {
      // keep original
    }
  }

  const newAdditional: string[] = [];
  for (let i = 0; i < localAdditional.length; i++) {
    const imgUrl = localAdditional[i];
    if (imgUrl && imgUrl.startsWith("http")) {
      try {
        const ext = getExtension(imgUrl);
        const filename = `img_${i + 1}${ext}`;
        const dest = path.join(productDir, filename);
        await downloadFile(imgUrl, dest);
        newAdditional.push(`/uploads/images/${product.id}/${filename}`);
      } catch (_e) {
        newAdditional.push(imgUrl);
      }
    } else {
      newAdditional.push(imgUrl);
    }
  }

  return { imageUrl: localImageUrl, additionalImages: newAdditional };
}

export async function startBulkImageDownload(): Promise<void> {
  if (progress.status === "running") return;

  progress = { status: "running", total: 0, completed: 0, failed: 0, current: "", errors: [] };

  setImmediate(async () => {
    try {
      ensureDir(IMAGES_DIR);
      const allProducts = await db.select().from(products);
      progress.total = allProducts.length;

      for (const product of allProducts) {
        progress.current = product.title || product.id.toString();
        try {
          const { imageUrl, additionalImages } = await downloadProductImages(product);
          await db.update(products)
            .set({ imageUrl, additionalImages })
            .where(eq(products.id, product.id));
          progress.completed++;
        } catch (err: any) {
          progress.failed++;
          progress.errors.push(`${product.id}: ${err.message}`);
        }
      }

      progress.status = "done";
      progress.current = "";
    } catch (err: any) {
      progress.status = "error";
      progress.errors.push(err.message);
    }
  });
}

export function saveUploadedImage(productId: string, buffer: Buffer, originalname: string): string {
  const productDir = path.join(IMAGES_DIR, productId);
  ensureDir(productDir);
  const ext = path.extname(originalname).toLowerCase() || ".jpg";
  const filename = `main${ext}`;
  fs.writeFileSync(path.join(productDir, filename), buffer);
  return `/uploads/images/${productId}/${filename}`;
}

export function saveUploadedDownload(productId: string, buffer: Buffer, originalname: string): string {
  const downloadsDir = path.join(UPLOADS_DIR, "downloads");
  ensureDir(downloadsDir);
  const ext = path.extname(originalname) || ".zip";
  const safeName = sanitizeFilename(path.basename(originalname, ext));
  const filename = `${productId}_${safeName}${ext}`;
  fs.writeFileSync(path.join(downloadsDir, filename), buffer);
  return `/uploads/downloads/${filename}`;
}
