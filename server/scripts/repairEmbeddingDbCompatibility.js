/**
 * Repair MongoDB product image aliases so the existing CLIP embedding URL index
 * can keep mapping AI results to products.
 *
 * Default mode is dry-run. Use --apply to append missing embedding URLs to
 * products.sourceImageUrls when a confident raw_products match is found.
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { normalizeImageUrl } from "../utils/imageUrlMatch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const FAISS_URLS_FILE = path.resolve(
  __dirname,
  "../../clip_model/image_urls (2).jsonl"
);
const CLEANED_CATALOG_FILE = path.resolve(__dirname, "../../src/data/cleaned.json");

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(Number(limitArg.slice("--limit=".length)) || 0, 0) : 0;

function unquote(line) {
  let value = String(line || "").trim();
  if (value.charCodeAt(0) === 34) value = value.slice(1);
  if (value.charCodeAt(value.length - 1) === 34) value = value.slice(0, -1);
  return value;
}

function loadEmbeddingUrls() {
  return fs
    .readFileSync(FAISS_URLS_FILE, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(unquote);
}

function imageUrlsOf(doc) {
  return [...(doc.images || []), ...(doc.sourceImageUrls || [])].filter(Boolean);
}

async function buildProductImageIndex() {
  const exact = new Set();
  const normalized = new Set();
  const cursor = Product.find({}, { images: 1, sourceImageUrls: 1 }).lean().cursor();

  for await (const product of cursor) {
    for (const url of imageUrlsOf(product)) {
      exact.add(String(url).trim());
      const key = normalizeImageUrl(url);
      if (key) normalized.add(key);
    }
  }

  return { exact, normalized };
}

async function buildProductLookup() {
  const byProductUrl = new Map();
  const bySourceId = new Map();
  const byBrandName = new Map();
  const cursor = Product.find(
    {},
    { sourceId: 1, brand: 1, name: 1, productUrl: 1 }
  )
    .lean()
    .cursor();

  for await (const product of cursor) {
    if (product.productUrl && !byProductUrl.has(product.productUrl)) {
      byProductUrl.set(product.productUrl, product);
    }
    if (product.sourceId && !bySourceId.has(Number(product.sourceId))) {
      bySourceId.set(Number(product.sourceId), product);
    }

    const brand = String(product.brand || "").trim().toLowerCase();
    const name = String(product.name || "").trim().toLowerCase();
    if (brand && name) {
      const key = `${brand}\u0000${name}`;
      if (!byBrandName.has(key)) byBrandName.set(key, product);
    }
  }

  return { byProductUrl, bySourceId, byBrandName };
}

async function buildRawImageIndex(rawProducts) {
  const byNormalizedImage = new Map();

  for await (const raw of rawProducts) {
    for (const url of raw.images || []) {
      const key = normalizeImageUrl(url);
      if (key && !byNormalizedImage.has(key)) {
        byNormalizedImage.set(key, raw);
      }
    }
  }

  return byNormalizedImage;
}

function buildCleanedCatalogImageIndex() {
  if (!fs.existsSync(CLEANED_CATALOG_FILE)) return new Map();

  const catalog = JSON.parse(fs.readFileSync(CLEANED_CATALOG_FILE, "utf8"));
  const byNormalizedImage = new Map();

  for (const item of catalog) {
    for (const url of item.images || []) {
      const key = normalizeImageUrl(url);
      if (key && !byNormalizedImage.has(key)) {
        byNormalizedImage.set(key, item);
      }
    }
  }

  return byNormalizedImage;
}

function findProductForCatalogItem(item, lookup) {
  if (!item) return null;

  const productUrl = item.product_url || item.productUrl;
  if (productUrl) {
    const byUrl = lookup.byProductUrl.get(productUrl);
    if (byUrl) return byUrl;
  }

  const sourceId = Number(item.id || item.sourceId);
  if (sourceId) {
    const bySourceId = lookup.bySourceId.get(sourceId);
    if (bySourceId) return bySourceId;
  }

  const brand = String(item.brand || "").trim().toLowerCase();
  const name = String(item.name || "").trim().toLowerCase();
  if (brand && name) {
    return lookup.byBrandName.get(`${brand}\u0000${name}`) || null;
  }

  return null;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const embeddingUrls = loadEmbeddingUrls();
  const { exact, normalized } = await buildProductImageIndex();

  const missing = [];
  let exactMatches = 0;
  let normalizedMatches = 0;

  for (const url of embeddingUrls) {
    if (exact.has(url)) exactMatches += 1;
    if (normalized.has(normalizeImageUrl(url))) {
      normalizedMatches += 1;
    } else {
      missing.push(url);
    }
  }

  const db = mongoose.connection.db;
  const rawCursor = db
    .collection("raw_products")
    .find({}, { projection: { product_url: 1, images: 1, brand: 1, name: 1 } });
  const rawByImage = await buildRawImageIndex(rawCursor);
  const cleanedByImage = buildCleanedCatalogImageIndex();
  const productLookup = await buildProductLookup();

  const candidates = [];
  const unresolved = [];
  const scanSet = limit > 0 ? missing.slice(0, limit) : missing;

  for (const url of scanSet) {
    const imageKey = normalizeImageUrl(url);
    const cleaned = cleanedByImage.get(imageKey);
    const raw = rawByImage.get(imageKey);
    const source = cleaned ? "cleaned.json" : "raw_products";
    const sourceItem = cleaned || raw;

    if (!sourceItem) {
      unresolved.push({ url, reason: "no cleaned.json/raw_products image match" });
      continue;
    }

    const product = cleaned
      ? findProductForCatalogItem(cleaned, productLookup)
      : productLookup.byProductUrl.get(raw.product_url);
    if (!product) {
      unresolved.push({
        url,
        productUrl: sourceItem.product_url || sourceItem.productUrl,
        sourceId: sourceItem.id || sourceItem.sourceId,
        source,
        reason: "source item has no product",
      });
      continue;
    }

    candidates.push({
      url,
      source,
      productId: product._id,
      sourceId: product.sourceId,
      brand: product.brand,
      name: product.name,
      productUrl: product.productUrl,
    });
  }

  let updated = 0;
  if (apply) {
    for (const item of candidates) {
      const result = await Product.updateOne(
        { _id: item.productId, sourceImageUrls: { $ne: item.url } },
        { $addToSet: { sourceImageUrls: item.url } }
      );
      updated += result.modifiedCount || 0;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        embeddingUrls: embeddingUrls.length,
        exactEmbeddingUrlMatches: exactMatches,
        normalizedEmbeddingUrlMatches: normalizedMatches,
        missingNormalizedCount: missing.length,
        scannedMissingCount: scanSet.length,
        repairCandidates: candidates.length,
        unresolvedCount: unresolved.length,
        updatedProducts: updated,
        sampleCandidates: candidates.slice(0, 10),
        sampleUnresolved: unresolved.slice(0, 10),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
