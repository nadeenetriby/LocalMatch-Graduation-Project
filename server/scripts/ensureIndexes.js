import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import { initSourceIdCounter } from "../models/Counter.js";

dotenv.config();

async function ensureIndexes() {
  await connectDB();

  const productIndexes = await Product.collection.indexes();
  const productUrlIdx = productIndexes.find((idx) => idx.key?.productUrl === 1);

  if (productUrlIdx && !productUrlIdx.unique) {
    console.log("Replacing non-unique productUrl index with unique index...");
    await Product.collection.dropIndex("productUrl_1");
    await Product.collection.createIndex({ productUrl: 1 }, { unique: true });
  } else if (!productUrlIdx) {
    console.log("Creating unique index on products.productUrl...");
    await Product.collection.createIndex({ productUrl: 1 }, { unique: true });
  } else {
    console.log("products.productUrl unique index already exists");
  }

  const hasBrandAvailability = productIndexes.some(
    (idx) => idx.key?.brand === 1 && idx.key?.isAvailable === 1
  );
  if (!hasBrandAvailability) {
    console.log("Creating index on products.brand + isAvailable...");
    await Product.collection.createIndex({ brand: 1, isAvailable: 1 });
  }

  const db = Product.db.db;
  const rawCol = db.collection("raw_products");
  await rawCol.createIndex({ product_url: 1 }, { unique: true });
  await rawCol.createIndex({ brand: 1, status: 1 });

  const maxDoc = await Product.findOne().sort({ sourceId: -1 }).lean();
  const maxId = maxDoc?.sourceId || 0;
  await initSourceIdCounter(maxId);
  console.log(`sourceId counter initialized at >= ${maxId}`);

  console.log("Indexes ensured successfully");
}

ensureIndexes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
