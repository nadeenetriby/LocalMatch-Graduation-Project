import express from "express";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
import { categoryNameCondition } from "../utils/category.js";
import { activeBrandFilter } from "../utils/productFilter.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 12, 48);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Brand.find(activeBrandFilter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Brand.countDocuments(activeBrandFilter),
    ]);
    res.json({
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:brandName/products", async (req, res, next) => {
  try {
    const brandName = decodeURIComponent(req.params.brandName).toLowerCase();
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const category = String(req.query.category || "ALL").toUpperCase();

    const base = { brand: brandName };
    const catCond = categoryNameCondition(category);
    if (catCond) Object.assign(base, catCond);

    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : null;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : null;
    if (
      (priceMin != null && !Number.isNaN(priceMin)) ||
      (priceMax != null && !Number.isNaN(priceMax))
    ) {
      base.price = {};
      if (priceMin != null && !Number.isNaN(priceMin)) base.price.$gte = priceMin;
      if (priceMax != null && !Number.isNaN(priceMax)) base.price.$lte = priceMax;
    }

    const filter = base;

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

export default router;
