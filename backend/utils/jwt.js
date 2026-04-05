import jwt from "jsonwebtoken";

// ─── Generate Tokens ──────────────────────────
export const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });

export const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

// ─── Verify Tokens ────────────────────────────
export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

// ─── Set Refresh Token Cookie ─────────────────
// Uses different cookie NAMES for user vs admin so they never overwrite
// each other when both apps run on the same localhost.
// Path is always "/" so the browser sends the cookie to all endpoints
// including /api/auth/refresh.
export const setRefreshTokenCookie = (res, token, isAdmin = false) => {
  const cookieName = isAdmin ? "adminRefreshToken" : "refreshToken";
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/",
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ─── Clear Refresh Token Cookie ───────────────
export const clearRefreshTokenCookie = (res, isAdmin = false) => {
  const cookieName = isAdmin ? "adminRefreshToken" : "refreshToken";
  res.cookie(cookieName, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/",
    expires:  new Date(0),
  });
};