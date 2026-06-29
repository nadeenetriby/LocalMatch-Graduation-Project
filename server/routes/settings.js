import express from "express";
import { Brand } from "../models/Brand.js";
import { getOrCreateFeatured } from "../services/siteSettings.js";

const router = express.Router();

router.get("/featured-brands", async (_req, res, next) => {
  try {
    const doc = await getOrCreateFeatured();
    const enriched = await Promise.all(
      (doc.featuredBrands || []).map(async (item) => {
        const plain = item.toObject ? item.toObject() : { ...item };
        const lookupName = String(plain.brandName || "").trim().toLowerCase();
        if (!lookupName) return plain;
        const brand = await Brand.findOne({ name: lookupName }).lean();
        if (!brand) return plain;
        return {
          ...plain,
          brandName: brand.name,
          drops: String(brand.productCount ?? 0),
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

export default router;
