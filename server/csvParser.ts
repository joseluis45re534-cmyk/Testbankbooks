import { parse } from "csv-parse/sync";
import fs from "fs";
import { storage } from "./storage";
import type { InsertProduct } from "@shared/schema";

function cleanHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function cleanDescription(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  const faqStartIndex = cleaned.indexOf("What is a test bank?");
  if (faqStartIndex !== -1) {
    cleaned = cleaned.substring(0, faqStartIndex);
  }
  
  cleaned = cleaned
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  return cleaned;
}

function extractCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("nursing") || titleLower.includes("nurse")) {
    return "Nursing";
  }
  if (titleLower.includes("anatomy") || titleLower.includes("physiology")) {
    return "Anatomy & Physiology";
  }
  if (titleLower.includes("pharmacology") || titleLower.includes("drug")) {
    return "Pharmacology";
  }
  if (titleLower.includes("psychology") || titleLower.includes("mental health") || titleLower.includes("psychiatric")) {
    return "Psychology & Mental Health";
  }
  if (titleLower.includes("pathophysiology")) {
    return "Pathophysiology";
  }
  if (titleLower.includes("radiology") || titleLower.includes("imaging")) {
    return "Radiology";
  }
  if (titleLower.includes("pediatric") || titleLower.includes("child")) {
    return "Pediatrics";
  }
  if (titleLower.includes("maternal") || titleLower.includes("newborn") || titleLower.includes("obstetric")) {
    return "Maternal & Newborn";
  }
  if (titleLower.includes("medical") || titleLower.includes("surgical")) {
    return "Medical-Surgical";
  }
  if (titleLower.includes("fundamentals")) {
    return "Fundamentals";
  }
  if (titleLower.includes("leadership") || titleLower.includes("management")) {
    return "Leadership & Management";
  }
  if (titleLower.includes("health") || titleLower.includes("public")) {
    return "Public Health";
  }
  if (titleLower.includes("assessment")) {
    return "Assessment";
  }
  if (titleLower.includes("immunology") || titleLower.includes("serology")) {
    return "Immunology";
  }
  if (titleLower.includes("blood") || titleLower.includes("transfusion")) {
    return "Laboratory";
  }
  
  return "Test Banks";
}

function parseImages(imagesStr: string): { mainImage: string | null; additionalImages: string[] } {
  if (!imagesStr || !imagesStr.trim()) {
    return { mainImage: null, additionalImages: [] };
  }
  
  const images = imagesStr.split(",").map(url => url.trim()).filter(url => url.length > 0);
  
  if (images.length === 0) {
    return { mainImage: null, additionalImages: [] };
  }
  
  return {
    mainImage: images[0],
    additionalImages: images.slice(1)
  };
}

interface WooCommerceRow {
  [key: string]: string | undefined;
}

export async function parseWooCommerceCsv(csvPath: string): Promise<InsertProduct[]> {
  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true
  }) as WooCommerceRow[];

  const products: InsertProduct[] = [];

  for (const row of records) {
    const id = row["ID"] || "";
    const title = cleanHtmlEntities(row["Name"] || "");
    const rawDescription = cleanHtmlEntities(row["Description"] || row["Short description"] || "");
    const description = cleanDescription(rawDescription);
    const price = row["Regular price"] || "0";
    const salePrice = row["Sale price"] || null;
    const imagesStr = row["Images"] || "";
    
    if (!id || !title) continue;
    
    const { mainImage, additionalImages } = parseImages(imagesStr);

    products.push({
      id: String(id),
      title,
      description: description || null,
      price: parseFloat(price) ? String(parseFloat(price).toFixed(2)) : "0.00",
      salePrice: salePrice && parseFloat(salePrice) ? String(parseFloat(salePrice).toFixed(2)) : null,
      imageUrl: mainImage,
      additionalImages: additionalImages.length > 0 ? additionalImages : null,
      productUrl: null,
      availability: "in_stock",
      condition: "new",
      brand: "TestBankGrade",
      category: extractCategory(title),
    });
  }

  return products;
}

export async function importFromCsv(csvPath: string): Promise<number> {
  try {
    console.log(`Parsing WooCommerce CSV from ${csvPath}...`);
    const products = await parseWooCommerceCsv(csvPath);
    console.log(`Parsed ${products.length} products from CSV`);
    
    if (products.length > 0) {
      console.log("Clearing existing products and importing from CSV...");
      await storage.clearAllProducts();
      await storage.insertProducts(products);
      const finalCount = await storage.getProductCount();
      console.log(`Successfully imported ${finalCount} products with images`);
      return finalCount;
    }
    
    return 0;
  } catch (error) {
    console.error("Error importing from CSV:", error);
    throw error;
  }
}
