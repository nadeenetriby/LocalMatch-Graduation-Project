/**
 * Compare exact vs tolerant URL mapping for AI search results.
 * Usage: node scripts/verifyUrlMapping.js [--query="formal office vest"]
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";
import { Product } from "../models/Product.js";
import {
  buildCandidateFilter,
  mapUrlsToProducts,
  mapUrlsToProductsExact,
} from "../utils/imageUrlMatch.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AI_BASE = process.env.AI_BASE || "http://127.0.0.1:8000";
const queryArg = process.argv.find((a) => a.startsWith("--query="));
const query = queryArg ? queryArg.slice("--query=".length) : "formal office vest";

const FAISS_URLS_FILE = path.join(
  __dirname,
  "..",
  "..",
  "clip_model",
  "image_urls (2).jsonl"
);

function loadSampleFaissUrls(limit = 20) {
  if (!fs.existsSync(FAISS_URLS_FILE)) return [];
  const lines = fs.readFileSync(FAISS_URLS_FILE, "utf8").split("\n").filter(Boolean);
  return lines.slice(0, limit).map((line) => line.trim().replace(/^"|"$/g, ""));
}

async function report(label, urls) {
  if (!urls.length) {
    console.log(`\n=== ${label} ===`);
    console.log("No URLs to test.");
    return;
  }

  const candidates = await Product.find(buildCandidateFilter(urls)).lean();
  const exact = mapUrlsToProductsExact(urls, candidates);
  const tolerant = mapUrlsToProducts(urls, candidates);

  console.log(`\n=== ${label} ===`);
  console.log(`FAISS URLs returned: ${urls.length}`);
  console.log(`MongoDB matched (exact, before fix): ${exact.length}`);
  console.log(`MongoDB matched (tolerant, after fix): ${tolerant.length}`);
  console.log(`Candidate products fetched: ${candidates.length}`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  let textUrls = [];
  try {
    const res = await axios.post(`${AI_BASE}/search-text`, { query }, { timeout: 120000 });
    textUrls = res.data?.results || [];
    await report(`Text search ("${query}")`, textUrls);
  } catch (err) {
    console.warn("AI text search unavailable:", err.message);
    const sample = loadSampleFaissUrls(20);
    await report("Sample FAISS URLs (first 20 from embedding index)", sample);
  }

  const sampleForImage = textUrls.length ? textUrls : loadSampleFaissUrls(20);
  if (sampleForImage.length) {
    await report("Image search (same URL set as text path)", sampleForImage);
  }

  console.log("\nDone.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
