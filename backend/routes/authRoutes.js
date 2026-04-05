import { Router } from "express";
import passport from "../utils/passport.js";
import {
  register,
  verifyEmail,
  resendOtp,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  googleCallback,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { registerRules, loginRules, validate } from "../middleware/validate.js";

const router = Router();

// ─── Email / Password Auth ────────────────────
router.post("/register",          registerRules, validate, register);
router.post("/verify-email",      verifyEmail);
router.post("/resend-otp",        resendOtp);
router.post("/login",             loginRules, validate, login);
router.post("/logout",            protect, logout);
router.post("/refresh",           refreshToken);
router.get("/me",                 protect, getMe);

// ─── Forgot / Reset Password ──────────────────
router.post("/forgot-password",   forgotPassword);
router.post("/verify-reset-otp",  verifyResetOtp);
router.post("/reset-password",    resetPassword);

// ─── Google OAuth ─────────────────────────────
// Step 1: Redirect user to Google consent screen
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Step 2: Google redirects back here after user approves
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_ORIGIN}/login?error=google_auth_failed`,
  }),
  googleCallback
);

router.get("/fix-otp-index", async (req, res) => {
  const OTP = (await import("../models/OTP.js")).default;
  try {
    await OTP.collection.dropIndex("expiresAt_1");
    await OTP.syncIndexes();
    res.json({ success: true, message: "OTP indexes rebuilt" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

export default router;