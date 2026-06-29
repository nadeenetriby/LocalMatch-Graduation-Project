import express from "express";
import mongoose from "mongoose";
import { CommunityLead } from "../models/CommunityLead.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Brand } from "../models/Brand.js";
import { authenticate, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getOrCreateFeatured } from "../services/siteSettings.js";
import {
  runBrandSync,
  runFullSync,
  getSyncStatus,
  validateBrandUrl,
  isSyncRunning,
  setBrandRunning,
} from "../services/syncRunner.js";
import { availableProductFilter } from "../utils/productFilter.js";

const router = express.Router();

router.use(authenticate, requireAuth, requireAdmin);

router.get("/overview", async (_req, res, next) => {
  try {
    const [userCount, productCount, brandCount, communityCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(availableProductFilter),
      Brand.countDocuments(),
      CommunityLead.countDocuments(),
    ]);
    res.json({ userCount, productCount, brandCount, communityCount });
  } catch (error) {
    next(error);
  }
});

router.get("/community", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CommunityLead.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CommunityLead.countDocuments(),
    ]);
    res.json({
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find()
        .select("email firstName lastName role createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);
    res.json({
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/sync/status", async (_req, res, next) => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.post("/sync/run", async (_req, res, next) => {
  try {
    if (isSyncRunning()) {
      return res.status(409).json({ message: "A sync is already in progress" });
    }
    const result = await runFullSync("manual");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** All brands (admin) */
router.get("/brands", async (_req, res, next) => {
  try {
    const items = await Brand.find().sort({ name: 1 }).lean();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.post("/brands", async (req, res, next) => {
  try {
    const raw = String(req.body?.name || "").trim();
    if (!raw) {
      return res.status(400).json({ message: "Name is required" });
    }
    const normalized = raw.toLowerCase();
    const url = String(req.body?.url || "").trim();
    if (!url) {
      return res.status(400).json({ message: "URL is required for scraping" });
    }

    const validation = await validateBrandUrl(url);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.error || "Invalid brand URL" });
    }

    const exists = await Brand.findOne({ name: normalized });
    if (exists) {
      return res.status(409).json({ message: "A brand with this name already exists" });
    }

    const active = req.body?.active !== false;
    const productCount = await Product.countDocuments({
      brand: normalized,
      ...availableProductFilter,
    });

    const brand = await Brand.create({
      name: normalized,
      url: validation.url,
      productCount,
      active,
      lastScrapeStatus: "running",
    });

    let scrape = { success: false, stats: null, error: null };
    try {
      scrape = await runBrandSync(normalized, "admin");
      const updated = await Brand.findById(brand._id).lean();
      return res.status(201).json({ ...updated, scrape });
    } catch (err) {
      await Brand.findByIdAndUpdate(brand._id, {
        lastScrapeStatus: "failed",
        lastScrapeError: err.message,
      });
      scrape.error = err.message;
      const updated = await Brand.findById(brand._id).lean();
      return res.status(201).json({
        ...updated,
        scrape,
        warning: "Brand saved but initial scrape failed",
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/brands/:id/scrape", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid brand id" });
    }
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    if (!brand.url) {
      return res.status(400).json({ message: "Brand has no URL configured" });
    }
    if (isSyncRunning()) {
      return res.status(409).json({ message: "A sync is already in progress" });
    }

    await setBrandRunning(id);
    const result = await runBrandSync(brand.name, "admin");
    const updated = await Brand.findById(id).lean();
    res.json({ brand: updated, scrape: result });
  } catch (error) {
    next(error);
  }
});

router.patch("/brands/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid brand id" });
    }
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    const newNameRaw = String(req.body?.name ?? "").trim();
    if (!newNameRaw) {
      return res.status(400).json({ message: "Name is required" });
    }
    let url = String(req.body?.url ?? brand.url ?? "").trim();
    const newNorm = newNameRaw.toLowerCase();

    if (req.body?.active !== undefined) {
      brand.active = Boolean(req.body.active);
    }

    if (url && url !== brand.url) {
      const validation = await validateBrandUrl(url);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.error || "Invalid brand URL" });
      }
      url = validation.url;
    }

    if (newNorm === brand.name) {
      brand.url = url;
      brand.productCount = await Product.countDocuments({
        brand: brand.name,
        ...availableProductFilter,
      });
      await brand.save();
      return res.json(brand);
    }
    const conflict = await Brand.findOne({ name: newNorm, _id: { $ne: brand._id } });
    if (conflict) {
      return res.status(409).json({ message: "Another brand already uses this name" });
    }
    const oldName = brand.name;
    await Product.updateMany({ brand: oldName }, { $set: { brand: newNorm } });
    brand.name = newNorm;
    brand.url = url;
    brand.productCount = await Product.countDocuments({
      brand: newNorm,
      ...availableProductFilter,
    });
    await brand.save();
    res.json(brand);
  } catch (error) {
    next(error);
  }
});

router.delete("/brands/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid brand id" });
    }
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    const cnt = await Product.countDocuments({ brand: brand.name });
    if (cnt > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${cnt} products still use "${brand.name}". Remove or reassign those products first.`,
      });
    }
    await Brand.deleteOne({ _id: brand._id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/featured-brands", async (_req, res, next) => {
  try {
    const doc = await getOrCreateFeatured();
    res.json(doc.featuredBrands);
  } catch (error) {
    next(error);
  }
});

router.put("/featured-brands", async (req, res, next) => {
  try {
    const { featuredBrands } = req.body || {};
    if (!Array.isArray(featuredBrands) || featuredBrands.length === 0) {
      return res.status(400).json({ message: "featuredBrands must be a non-empty array" });
    }
    if (featuredBrands.length > 12) {
      return res.status(400).json({ message: "Maximum 12 featured brands" });
    }
    for (const item of featuredBrands) {
      if (!item || typeof item !== "object") {
        return res.status(400).json({ message: "Invalid featured brand entry" });
      }
      if (
        !String(item.brandName || "").trim() ||
        !String(item.name || "").trim() ||
        !String(item.title || "").trim() ||
        !String(item.color || "").trim()
      ) {
        return res.status(400).json({ message: "Each entry needs brand, name, title, and color" });
      }
      const brandName = String(item.brandName).trim().toLowerCase();
      const brand = await Brand.findOne({ name: brandName });
      if (!brand) {
        return res.status(400).json({ message: `Unknown brand: ${brandName}` });
      }
    }
    const doc = await getOrCreateFeatured();
    doc.featuredBrands = await Promise.all(
      featuredBrands.map(async (item) => {
        const brandName = String(item.brandName).trim().toLowerCase();
        const brand = await Brand.findOne({ name: brandName }).lean();
        return {
          brandName,
          name: String(item.name).trim(),
          title: String(item.title).trim(),
          category: String(item.category || "").trim(),
          drops: String(brand?.productCount ?? item.drops ?? "0"),
          color: String(item.color).trim(),
          textColor: String(item.textColor || "white").trim(),
        };
      })
    );
    await doc.save();
    res.json(doc.featuredBrands);
  } catch (error) {
    next(error);
  }
});

export default router;
