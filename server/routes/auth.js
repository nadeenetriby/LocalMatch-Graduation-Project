import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { authenticate, requireAuth } from "../middleware/auth.js";

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim() === "") {
    const err = new Error(
      "JWT_SECRET is not set in server/.env — add a long random string and restart the API"
    );
    err.statusCode = 503;
    throw err;
  }
  return jwt.sign({ sub: String(user._id), role: user.role }, secret, {
    expiresIn: "7d",
  });
}

function userResponse(user) {
  return {
    id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    favoriteSourceIds: user.favoriteSourceIds || [],
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, firstName = "", lastName = "" } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      passwordHash,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      role: "user",
    });
    const token = signToken(user);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.passwordHash) {
      return res.status(500).json({
        message:
          "This account has no password set. Run: cd server && npm run create-admin",
      });
    }
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken(user);
    res.json({ token, user: userResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(userResponse(user));
  } catch (error) {
    next(error);
  }
});

router.post("/merge-favorites", authenticate, requireAuth, async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    const incoming = Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const merged = [...new Set([...(user.favoriteSourceIds || []), ...incoming])];
    user.favoriteSourceIds = merged;
    await user.save();
    res.json({ favoriteSourceIds: user.favoriteSourceIds });
  } catch (error) {
    next(error);
  }
});

export default router;
