import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import { Brand } from "../models/Brand.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../../src/data/cleaned.json");

function normalizeItem(item) {
  return {
    sourceId: Number(item.id),
    brand: String(item.brand || "").trim().toLowerCase(),
    name: String(item.name || "").trim(),
    price: Number(item.price || 0),
    currency: String(item.currency || "EGP").trim(),
    productUrl: String(item.product_url || "").trim(),
    images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
  };
}

async function seed() {
  await connectDB();

  const raw = await readFile(dataPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("cleaned.json must contain an array");
  }

  const products = parsed
    .map(normalizeItem)
    .filter((item) => item.sourceId && item.brand && item.name && item.productUrl);

  const brandCounts = products.reduce((acc, item) => {
    acc[item.brand] = (acc[item.brand] || 0) + 1;
    return acc;
  }, {});

  const brands = Object.entries(brandCounts).map(([name, productCount]) => ({
    name,
    productCount,
  }));

  await Promise.all([Product.deleteMany({}), Brand.deleteMany({})]);
  await Product.insertMany(products, { ordered: false });
  await Brand.insertMany(brands, { ordered: false });

  console.log(`Seeded ${products.length} products and ${brands.length} brands`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
