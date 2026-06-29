import { imageMap } from "../cache/imageCache.js";

import express from "express";
import { Product } from "../models/Product.js";
import { categoryNameCondition } from "../utils/category.js";
import {
  buildCandidateFilter,
  mapUrlsToProducts,
} from "../utils/imageUrlMatch.js";
const router = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/batch", async (req, res, next) => {
  try {
    const raw = String(req.query.ids || "");
    const ids = [...new Set(raw.split(",").map(Number).filter(Boolean))].slice(0, 100);
    if (ids.length === 0) {
      return res.json([]);
    }
    const items = await Product.find({ sourceId: { $in: ids } }).lean();
    const order = new Map(ids.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.sourceId) ?? 0) - (order.get(b.sourceId) ?? 0));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const brand = String(req.query.brand || "").trim().toLowerCase();
    const category = String(req.query.category || "ALL").toUpperCase();
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const base = {};
    if (brand) base.brand = brand;
    if (q) {
      const pattern = escapeRegex(q);
      base.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { brand: { $regex: pattern, $options: "i" } },
      ];
    }
    const catCond = categoryNameCondition(category);
    if (catCond) Object.assign(base, catCond);

    const filter = base;

    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : null;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : null;
    if (
      (priceMin != null && !Number.isNaN(priceMin)) ||
      (priceMax != null && !Number.isNaN(priceMax))
    ) {
      filter.price = {};
      if (priceMin != null && !Number.isNaN(priceMin)) filter.price.$gte = priceMin;
      if (priceMax != null && !Number.isNaN(priceMax)) filter.price.$lte = priceMax;
    }

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const listFilter = {};
    const [items, total] = await Promise.all([
      Product.find(listFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(listFilter),
    ]);

    res.json({
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:sourceId", async (req, res, next) => {
  try {
    const sourceId = Number(req.params.sourceId);
    if (Number.isNaN(sourceId)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const item = await Product.findOne({ sourceId }).lean();

    if (!item) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

/// AI image URL mapping


// const imageMap = new Map();

// // on server start
// const products = await Product.find();

// products.forEach(p => {
//   (p.images || []).forEach(img => {
//     imageMap.set(img.split("?")[0], p);
//   });
// });

// router.post("/by-urls", (req, res) => {
//   const { urls } = req.body;

//   const clean = urls.map(u => u.split("?")[0]);

//   const result = clean
//     .map(u => imageMap.get(u))
//     .filter(Boolean);

//   res.json(result);
// });


router.post("/by-urls", (req, res) => {

  const { urls } = req.body;

  if (!urls || urls.length === 0) {
    return res.json([]);
  }

  const result = [];
  const seen = new Set();

  for (const url of urls) {

    const product = imageMap.get(url);

    if (!product) continue;

    // Prevent duplicates
    if (seen.has(product._id.toString())) continue;

    seen.add(product._id.toString());

    result.push(product);
  }

  res.json(result);

});
export default router;

