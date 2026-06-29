import express from "express";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { authenticate, requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate, requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const ids = user.favoriteSourceIds || [];
    if (ids.length === 0) return res.json({ items: [] });
    const products = await Product.find({ sourceId: { $in: ids } }).lean();
    const order = new Map(ids.map((id, i) => [id, i]));
    products.sort((a, b) => (order.get(a.sourceId) ?? 0) - (order.get(b.sourceId) ?? 0));
    res.json({ items: products });
  } catch (error) {
    next(error);
  }
});

router.post("/toggle", async (req, res, next) => {
  try {
    const sourceId = Number((req.body || {}).sourceId);
    if (!sourceId) {
      return res.status(400).json({ message: "sourceId required" });
    }
    const exists = await Product.exists({ sourceId });
    if (!exists) return res.status(404).json({ message: "Product not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const set = new Set(user.favoriteSourceIds || []);
    if (set.has(sourceId)) set.delete(sourceId);
    else set.add(sourceId);
    user.favoriteSourceIds = [...set];
    await user.save();
    const favorited = user.favoriteSourceIds.includes(sourceId);
    res.json({ favoriteSourceIds: user.favoriteSourceIds, favorited });
  } catch (error) {
    next(error);
  }
});

export default router;
