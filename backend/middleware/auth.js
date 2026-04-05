import { verifyAccessToken } from "../utils/jwt.js";
import { sendUnauthorized, sendForbidden } from "../utils/response.js";
import User from "../models/User.js";

// ─── protect ─────────────────────────────────
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return sendUnauthorized(res, "No token provided. Please sign in.");
    }

    const token   = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) return sendUnauthorized(res, "User no longer exists.");

    // Reject banned users immediately
    if (user.isBanned) {
      return sendForbidden(res, `Your account has been suspended. Reason: ${user.banReason || "Policy violation"}`);
    }

    // Manually compute totalScreens in case virtuals aren't enabled on the schema
    // 1 base screen per active subscription + active purchased screens
    if (user.totalScreens === undefined) {
      const hasActiveSub = user.subscription?.status === "active";
      const now = new Date();
      const extraScreens = (user.screenPurchases || []).filter((s) => {
        if (s.status !== "active") return false;
        if (s.expiresAt && s.expiresAt < now) return false;
        return true;
      }).length;
      user.totalScreens = (hasActiveSub ? 1 : 0) + extraScreens;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendUnauthorized(res, "Access token expired. Please refresh.");
    if (err.name === "JsonWebTokenError")  return sendUnauthorized(res, "Invalid token.");
    next(err);
  }
};

// ─── optionalAuth ─────────────────────────────
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) { req.user = null; return next(); }

    const token   = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    req.user = await User.findById(decoded.id).select("-password -refreshToken");
  } catch {
    req.user = null;
  }
  next();
};

// ─── requireRole ─────────────────────────────
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return sendForbidden(res, "You do not have permission to perform this action.");
  }
  next();
};

// ─── adminOnly ────────────────────────────────
export const adminOnly = requireRole("admin");