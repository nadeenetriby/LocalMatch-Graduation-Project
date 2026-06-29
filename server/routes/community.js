import express from "express";
import { CommunityLead } from "../models/CommunityLead.js";

const router = express.Router();

router.post("/subscribe", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const normalized = String(email || "").toLowerCase().trim();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return res.status(400).json({ message: "Valid email required" });
    }
    await CommunityLead.create({ email: normalized, source: "community_section" });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
