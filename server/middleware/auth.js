import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

/** Attach req.user if valid Bearer JWT; otherwise req.user is null. */
export async function authenticate(req, _res, next) {
  req.user = null;
  try {
    const token = getBearerToken(req);
    if (!token) return next();
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).lean();
    if (user) {
      req.user = {
        id: String(user._id),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
    next();
  } catch {
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
