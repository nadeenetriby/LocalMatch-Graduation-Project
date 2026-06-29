import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();

  console.log("=== COLLECTIONS ===");
  for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`${c.name}: ${count}`);
  }

  for (const name of ["products", "brands", "users", "sitesettings"]) {
    const exists = cols.some((c) => c.name === name);
    if (!exists) continue;

    const col = db.collection(name);
    console.log(`\n=== SAMPLE: ${name} ===`);
    const sample = await col.findOne({});
    console.log(JSON.stringify(sample, null, 2));

    const indexes = await col.indexes();
    console.log(
      "INDEXES:",
      JSON.stringify(
        indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique })),
        null,
        2
      )
    );
  }

  const products = db.collection("products");
  const fieldStats = await products
    .aggregate([
      {
        $project: {
          hasSourceId: { $cond: [{ $ifNull: ["$sourceId", false] }, 1, 0] },
          hasProductUrl: { $cond: [{ $ifNull: ["$productUrl", false] }, 1, 0] },
          hasIsAvailable: { $cond: [{ $ifNull: ["$isAvailable", false] }, 1, 0] },
          hasLastSynced: { $cond: [{ $ifNull: ["$lastSyncedAt", false] }, 1, 0] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withSourceId: { $sum: "$hasSourceId" },
          withProductUrl: { $sum: "$hasProductUrl" },
          withIsAvailable: { $sum: "$hasIsAvailable" },
          withLastSynced: { $sum: "$hasLastSynced" },
        },
      },
    ])
    .toArray();
  console.log("\n=== PRODUCT FIELD STATS ===");
  console.log(JSON.stringify(fieldStats[0], null, 2));

  const brands = db.collection("brands");
  const brandSample = await brands.find({ url: { $exists: true, $ne: "" } }).limit(3).toArray();
  console.log("\n=== BRANDS WITH URL (sample) ===");
  console.log(JSON.stringify(brandSample, null, 2));

  const dupUrls = await products
    .aggregate([
      { $match: { productUrl: { $exists: true, $ne: "" } } },
      { $group: { _id: "$productUrl", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 },
    ])
    .toArray();
  console.log("\n=== DUPLICATE productUrl (if any, max 5) ===");
  console.log(JSON.stringify(dupUrls, null, 2));

  const maxDoc = await products.find().sort({ sourceId: -1 }).limit(1).toArray();
  console.log("\n=== MAX sourceId ===", maxDoc[0]?.sourceId);

  const shopifyCount = await products.countDocuments({
    images: { $elemMatch: { $regex: /cdn\.shopify/i } },
  });
  console.log("Products with Shopify CDN images:", shopifyCount);

  const brandsNoUrl = await brands.countDocuments({
    $or: [{ url: { $exists: false } }, { url: "" }],
  });
  const brandsWithUrl = await brands.countDocuments({
    url: { $exists: true, $ne: "" },
  });
  console.log("Brands without url:", brandsNoUrl);
  console.log("Brands with url:", brandsWithUrl);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
