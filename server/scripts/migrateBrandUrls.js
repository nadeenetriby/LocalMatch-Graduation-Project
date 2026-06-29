import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "../config/db.js";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandsTxtPath = path.resolve(__dirname, "../../data/brands.txt");

function normalizeUrl(line) {
  let url = line.trim();
  if (!url || url.startsWith("#")) return null;
  if (!url.startsWith("http")) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

function deriveNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.replace(/^\/+|\/+$/g, "");

    if (host.endsWith(".myshopify.com")) {
      return host.split(".")[0];
    }
    if (host === "sllr.co" && pathname) {
      return pathname.split("/")[0].toLowerCase();
    }
    return host.split(".")[0].replace(/[^a-z0-9-]/g, "");
  } catch {
    return "";
  }
}

function domainFromProductUrl(productUrl) {
  try {
    return new URL(productUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function scoreMatch(brandName, url) {
  const derived = deriveNameFromUrl(url);
  const name = brandName.toLowerCase();
  if (name === derived) return 100;
  if (derived.includes(name) || name.includes(derived)) return 80;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.startsWith(name)) return 70;
    if (host.includes(name)) return 60;
  } catch {
    /* ignore */
  }
  return 0;
}

async function migrate() {
  await connectDB();

  const raw = await readFile(brandsTxtPath, "utf-8");
  const urls = raw
    .split("\n")
    .map(normalizeUrl)
    .filter(Boolean);

  const brands = await Brand.find().lean();
  const brandByName = new Map(brands.map((b) => [b.name, b]));

  // Build domain hints from existing products
  const domainHints = new Map();
  for (const brand of brands) {
    const sample = await Product.findOne({ brand: brand.name }).lean();
    if (sample?.productUrl) {
      domainHints.set(brand.name, domainFromProductUrl(sample.productUrl));
    }
  }

  let matched = 0;
  let skipped = 0;
  const unmatched = [];

  for (const url of urls) {
    const derived = deriveNameFromUrl(url);
    let bestBrand = null;
    let bestScore = 0;

    for (const brand of brands) {
      let s = scoreMatch(brand.name, url);
      const hint = domainHints.get(brand.name);
      if (hint) {
        try {
          const urlHost = new URL(url.startsWith("http") ? url : `https://${url}`)
            .hostname.replace(/^www\./, "")
            .toLowerCase();
          if (hint === urlHost || urlHost.includes(hint) || hint.includes(urlHost)) {
            s = Math.max(s, 90);
          }
        } catch {
          /* ignore */
        }
      }
      if (s > bestScore) {
        bestScore = s;
        bestBrand = brand;
      }
    }

    if (bestBrand && bestScore >= 60) {
      const existing = await Brand.findById(bestBrand._id);
      if (existing && !existing.url) {
        existing.url = url;
        existing.active = true;
        await existing.save();
        matched += 1;
        console.log(`Matched ${bestBrand.name} ← ${url} (score=${bestScore})`);
      } else {
        skipped += 1;
      }
    } else if (brandByName.has(derived)) {
      const existing = await Brand.findOne({ name: derived });
      if (existing && !existing.url) {
        existing.url = url;
        existing.active = true;
        await existing.save();
        matched += 1;
        console.log(`Matched (derived) ${derived} ← ${url}`);
      }
    } else {
      unmatched.push({ url, derived, bestScore });
    }
  }

  console.log(`\nDone. Matched=${matched} skipped=${skipped} unmatched=${unmatched.length}`);
  if (unmatched.length) {
    console.log("Unmatched URLs (first 20):");
    unmatched.slice(0, 20).forEach((u) =>
      console.log(`  ${u.url} (derived=${u.derived}, bestScore=${u.bestScore})`)
    );
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
