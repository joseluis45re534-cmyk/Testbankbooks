import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { storage } from "./storage";
import type { InsertProduct } from "@shared/schema";

function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("pathophysiology")) {
    return "Pathophysiology";
  }
  if (titleLower.includes("pharmacology") || titleLower.includes("drug")) {
    return "Pharmacology";
  }
  if (titleLower.includes("anatomy") || titleLower.includes("physiology")) {
    return "Anatomy & Physiology";
  }
  if (titleLower.includes("psychology") || titleLower.includes("mental health") || titleLower.includes("psychiatric")) {
    return "Psychology & Mental Health";
  }
  if (titleLower.includes("pediatric") || titleLower.includes("child")) {
    return "Pediatrics";
  }
  if (titleLower.includes("maternal") || titleLower.includes("maternity") || titleLower.includes("newborn") || titleLower.includes("obstetric")) {
    return "Maternal & Newborn";
  }
  if (titleLower.includes("medical") && titleLower.includes("surgical")) {
    return "Medical-Surgical";
  }
  if (titleLower.includes("foundation") || titleLower.includes("fundamentals")) {
    return "Fundamentals";
  }
  if (titleLower.includes("leadership") || titleLower.includes("management")) {
    return "Leadership & Management";
  }
  if (titleLower.includes("community") || titleLower.includes("public health")) {
    return "Public Health";
  }
  if (titleLower.includes("assessment")) {
    return "Assessment";
  }
  if (titleLower.includes("nursing") || titleLower.includes("nurse")) {
    return "Nursing";
  }
  if (titleLower.includes("nutrition")) {
    return "Nutrition";
  }
  if (titleLower.includes("gerontological") || titleLower.includes("geriatric")) {
    return "Gerontology";
  }
  
  return "Test Banks";
}

interface ShopifyRow {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Tags: string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Image Src": string;
  Status: string;
  Published: string;
}

export async function importFromShopifyCsv(csvPath: string): Promise<number> {
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  
  const records: ShopifyRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  const productMap = new Map<string, {
    title: string;
    description: string;
    tags: string;
    price: string;
    comparePrice: string;
    imageUrl: string;
    slug: string;
  }>();

  for (const row of records) {
    const handle = row.Handle?.trim();
    if (!handle) continue;

    if (!productMap.has(handle)) {
      const title = row.Title?.trim();
      if (!title) continue;

      const price = row["Variant Price"]?.trim() || "0";
      const comparePrice = row["Variant Compare At Price"]?.trim() || "";
      
      productMap.set(handle, {
        title,
        description: row["Body (HTML)"] || "",
        tags: row.Tags || "",
        price,
        comparePrice,
        imageUrl: row["Image Src"]?.trim() || "",
        slug: handle,
      });
    } else {
      const existing = productMap.get(handle)!;
      if (!existing.imageUrl && row["Image Src"]?.trim()) {
        existing.imageUrl = row["Image Src"].trim();
      }
    }
  }

  let importedCount = 0;

  const entries = Array.from(productMap.entries());
  
  for (const [slug, data] of entries) {
    const cleanDescription = cleanHtml(data.description);
    const category = extractCategory(data.title);
    
    const salePrice = data.price;
    const originalPrice = data.comparePrice || data.price;

    const product: InsertProduct = {
      id: slug.substring(0, 50),
      title: data.title,
      description: cleanDescription,
      price: originalPrice,
      salePrice: salePrice !== originalPrice ? salePrice : null,
      imageUrl: data.imageUrl || null,
      category,
    };

    try {
      const existingProduct = await storage.getProductBySlug(slug);
      if (existingProduct) {
        await storage.updateProduct(existingProduct.id, {
          title: product.title,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          imageUrl: product.imageUrl,
          category: product.category,
        });
      } else {
        await storage.insertProductWithSlug(product, slug);
      }
      importedCount++;
    } catch (error) {
      console.error(`Error importing product ${slug}:`, error);
    }
  }

  return importedCount;
}
