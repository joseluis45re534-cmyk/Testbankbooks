import { storage } from "./express-storage";
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

function normalizeProductTitle(title: string): string {
  return title
    .replace(/Educational Software/gi, "Test Bank")
    .replace(/\s{2,}/g, " ")
    .trim();
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

function parseXmlValue(xml: string, tag: string): string {
  // Try with g: namespace first
  let regex = new RegExp(`<g:${tag}[^>]*>([\\s\\S]*?)<\\/g:${tag}>`, "i");
  let match = xml.match(regex);
  if (match) {
    return cleanHtmlEntities(match[1]);
  }
  
  // Try without namespace
  regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  match = xml.match(regex);
  return match ? cleanHtmlEntities(match[1]) : "";
}

function parsePrice(priceStr: string): string {
  if (!priceStr) return "0.00";
  const match = priceStr.match(/(\d+\.?\d*)/);
  return match ? match[1] : "0.00";
}

export async function parseXmlFeed(xmlContent: string): Promise<InsertProduct[]> {
  const products: InsertProduct[] = [];
  
  // Split by <item> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xmlContent)) !== null) {
    const itemXml = match[1];
    
    const id = parseXmlValue(itemXml, "id");
    const title = parseXmlValue(itemXml, "title");
    const description = parseXmlValue(itemXml, "description");
    const link = parseXmlValue(itemXml, "link");
    const imageLink = parseXmlValue(itemXml, "image_link");
    const price = parseXmlValue(itemXml, "price");
    const salePrice = parseXmlValue(itemXml, "sale_price");
    const availability = parseXmlValue(itemXml, "availability");
    const condition = parseXmlValue(itemXml, "condition");
    const brand = parseXmlValue(itemXml, "brand");
    
    if (id && title) {
      const cleanTitle = normalizeProductTitle(cleanHtmlEntities(title));
      products.push({
        id,
        title: cleanTitle,
        description: description || null,
        price: parsePrice(price),
        salePrice: salePrice ? parsePrice(salePrice) : null,
        imageUrl: imageLink || null,
        productUrl: link || null,
        availability: availability || "in_stock",
        condition: condition || "new",
        brand: brand || "TestBankGrade",
        category: extractCategory(title),
      });
    }
  }
  
  return products;
}

export async function fetchAndImportProducts(): Promise<number> {
  try {
    // Check if products already exist
    const existingCount = await storage.getProductCount();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} products, skipping import`);
      return existingCount;
    }

    console.log("Fetching XML feed from testbankgrade.com...");
    const response = await fetch("https://testbankgrade.com/api/feeds/google-shopping.xml");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XML feed: ${response.statusText}`);
    }
    
    const xmlContent = await response.text();
    console.log(`XML feed fetched (${xmlContent.length} bytes), parsing products...`);
    
    const products = await parseXmlFeed(xmlContent);
    console.log(`Parsed ${products.length} products from XML feed`);
    
    if (products.length > 0) {
      console.log("Importing products to database...");
      await storage.insertProducts(products);
      const finalCount = await storage.getProductCount();
      console.log(`Successfully imported. Database now has ${finalCount} products`);
      return finalCount;
    }
    
    return products.length;
  } catch (error) {
    console.error("Error importing products:", error);
    throw error;
  }
}
